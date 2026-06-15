import {
  condition,
  defineQuery,
  defineSignal,
  setHandler,
  proxyActivities,
  sleep,
} from "@temporalio/workflow";
import * as activities from "./activities";
import {
  hasIntersection,
  durationToMs,
  TriggerEventPayload,
  WorkflowConfig,
  WorkflowInstance,
} from "@prospectbd/workflows/common";

// ─── Signals & Queries ────────────────────────────────────────────────────────

export const triggerEventSignal =
  defineSignal<[TriggerEventPayload]>("triggerEvent");
export const getInstanceQuery = defineQuery<WorkflowInstance>("getInstance");
export const getConfigQuery = defineQuery<WorkflowConfig>("getConfig");

// ─── Activity Proxy ───────────────────────────────────────────────────────────

const { publishEvent, sendEscalationAlert } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "1 minute",
});

interface WorkflowState {
  currentStateId: string;
  lastEventId: string | null;
  data: Record<string, unknown>;
  history: WorkflowInstance["history"];
  /**
   * Tracks fired escalations by a composite key:
   *   `${level}:${stateId}:${occurrenceIndex}`
   *
   * Using occurrence index (position in the source array) rather than
   * escalation ID means the same alert ID can appear multiple times in
   * the same state and each entry is tracked independently.
   *
   * Examples:
   *   "step:awaiting_payment:0"   – first escalation in that state
   *   "step:awaiting_payment:1"   – second escalation (even if same id)
   *   "global:__root__:0"         – first global escalation
   */
  triggeredEscalations: Set<string>;
  startTime: string;
  stateEntryTime: string;
}

type ActiveEscalation = NonNullable<
  WorkflowConfig["stateMachine"]["states"][number]["escalations"]
>[number] & {
  baseTime: number;
  level: "step" | "global";
  /**
   * Stable composite key that uniquely identifies this occurrence,
   * regardless of whether the escalation id is shared with another entry.
   */
  occurrenceKey: string;
};

type EscalationWithDeadline = ActiveEscalation & {
  resolvedDeadline: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInstance(
  config: WorkflowConfig,
  state: WorkflowState,
): WorkflowInstance {
  const currentState = config.stateMachine.states.find(
    (s) => s.state === state.currentStateId,
  );

  return {
    workflowId: config.workflowId!,
    definitionName: config.definitionName,
    resourceType: config.resourceType,
    currentState,
    event: state.lastEventId ?? "",
    data: state.data,
    history: state.history,
  };
}

function isAllowedToTrigger(
  config: WorkflowConfig,
  currentStateId: string,
  userRoles: string[],
): boolean {
  const currentState = config.stateMachine.states.find(
    (s) => s.state === currentStateId,
  );

  if (!currentState) return false;
  if (currentState.requiredRoles.length === 0) return true;

  return hasIntersection(currentState.requiredRoles, userRoles);
}

function applyTransition(
  config: WorkflowConfig,
  state: WorkflowState,
  {
    eventId,
    data: eventData = {},
    userRoles = ["customer"],
  }: TriggerEventPayload,
): void {
  const actualEventId = eventId.includes(".")
    ? eventId.split(".").slice(1).join(".")
    : eventId;

  const transition = config.stateMachine.transitions.find(
    (t) => t.fromState === state.currentStateId && t.eventId === actualEventId,
  );

  if (!transition) {
    console.warn(
      `[Workflow: ${config.definitionName}] No transition found for event "${eventId}" in state "${state.currentStateId}"`,
    );
    return;
  }
  if (!isAllowedToTrigger(config, state.currentStateId, userRoles)) {
    console.warn(
      `[Workflow: ${config.definitionName}] Event "${eventId}" not allowed for roles [${userRoles.join(", ")}] in state "${state.currentStateId}"`,
    );
    return;
  }

  const fromStep = state.currentStateId;
  const toStep = transition.toState;

  const fullEventId = eventId.includes(`${config.definitionName}.`)
    ? eventId
    : `${config.definitionName}.${eventId}`;

  const now = new Date().toISOString();

  state.history.push({
    eventId: fullEventId,
    fromStep,
    toStep,
    data: eventData,
    timestamp: now,
  });

  state.currentStateId = toStep;
  state.stateEntryTime = now;
  state.lastEventId = fullEventId;
  state.data = { ...state.data, ...eventData };

  console.log(
    `[Workflow: ${config.definitionName}] Transitioned: ${fromStep} --(${fullEventId})--> ${toStep}`,
  );
}

// ─── Deadline Resolution ──────────────────────────────────────────────────────

/**
 * Resolves the absolute deadline timestamp (ms) for an escalation entry.
 *
 * Resolution order:
 *  1. `deadline` is a Date object → use directly.
 *  2. `deadline` is a string → treat as a key into `state.data`; fall back to
 *     the string itself if the key is absent; parse as an ISO date string.
 *  3. `after` is defined → baseTime + duration converted to ms.
 *  4. Neither → `Infinity` (no deadline, escalation never fires).
 */
function resolveEscalationDeadline(
  escalation: ActiveEscalation,
  state: WorkflowState,
): number {
  if (escalation.deadline !== undefined) {
    if (escalation.deadline instanceof Date) {
      return escalation.deadline.getTime();
    }

    // Treat as a data-field key, with the raw string value as fallback
    const deadlineField = escalation.deadline;
    const dataVal = state.data[deadlineField];
    const finalVal = dataVal !== undefined ? dataVal : deadlineField;

    if (finalVal instanceof Date) {
      return finalVal.getTime();
    }

    const dateStr = typeof finalVal === "string" ? finalVal : String(finalVal);
    const parsed = Date.parse(dateStr);

    return isNaN(parsed) ? Infinity : parsed;
  }

  if (escalation.after !== undefined) {
    return (
      escalation.baseTime +
      durationToMs(escalation.after.duration, escalation.after.unit)
    );
  }

  return Infinity;
}

// ─── Signal & Query Registration ─────────────────────────────────────────────

function registerHandlers(
  config: WorkflowConfig,
  state: WorkflowState,
  getInstance: () => WorkflowInstance,
): void {
  setHandler(getInstanceQuery, getInstance);
  setHandler(getConfigQuery, () => config);

  setHandler(triggerEventSignal, (payload: TriggerEventPayload) => {
    applyTransition(config, state, payload);
  });
}

// ─── Escalation Loop ──────────────────────────────────────────────────────────

async function handleEscalations(
  config: WorkflowConfig,
  state: WorkflowState,
): Promise<void> {
  const workflowStartTime = new Date(state.startTime).getTime();
  const stateEntryTime = new Date(state.stateEntryTime).getTime();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const frozenStateId = state.currentStateId;

    // 1. Collect active (un-triggered) escalations for the current state.
    //    Composite key format: `${level}:${stateId}:${index}`
    //    The index is the position within the source array, making it stable
    //    and unique even when the same alert id appears more than once.
    const stepEscalations =
      config.stateMachine.states.find((s) => s.state === frozenStateId)
        ?.escalations ?? [];
    const globalEscalations = config.stateMachine.escalations ?? [];

    const activeEscalations: ActiveEscalation[] = [
      ...stepEscalations.map((e, idx) => ({
        ...e,
        baseTime: stateEntryTime,
        level: "step" as const,
        occurrenceKey: `step:${frozenStateId}:${idx}`,
      })),
      ...globalEscalations.map((e, idx) => ({
        ...e,
        baseTime: workflowStartTime,
        level: "global" as const,
        occurrenceKey: `global:__root__:${idx}`,
      })),
    ].filter((e) => !state.triggeredEscalations.has(e.occurrenceKey));

    if (activeEscalations.length === 0) {
      await condition(() => state.currentStateId !== frozenStateId);
      break;
    }

    // 2. Resolve deadlines and find the earliest upcoming escalation
    const now = Date.now();

    const withDeadlines: EscalationWithDeadline[] = activeEscalations
      .map((e) => ({
        ...e,
        resolvedDeadline: resolveEscalationDeadline(e, state),
      }))
      .filter((e) => e.resolvedDeadline !== Infinity)
      .sort((a, b) => a.resolvedDeadline - b.resolvedDeadline);

    if (withDeadlines.length === 0) {
      await condition(() => state.currentStateId !== frozenStateId);
      break;
    }

    const nextEscalation = withDeadlines[0];
    const waitMs = Math.max(0, nextEscalation.resolvedDeadline - now);

    const stateChanged = () => state.currentStateId !== frozenStateId;
    const resolved = await condition(stateChanged, waitMs);

    if (stateChanged()) {
      break;
    }

    // 3. Timed out — fire the escalation
    if (!resolved) {
      // Mark as triggered using the occurrence key, not the alert id
      state.triggeredEscalations.add(nextEscalation.occurrenceKey);

      if (nextEscalation.actionType === "raise-event") {
        applyTransition(config, state, {
          workflowId: config.workflowId!,
          eventId: nextEscalation.eventId,
          data: {
            resourceType: config.resourceType,
            id: config.workflowId!,
            escalationId: nextEscalation.id,
            timestamp: new Date().toISOString(),
          },
          userRoles: ["admin"],
        });
      } else if (nextEscalation.actionType === "send-sla") {
        const alertConfig = config.alerts?.find(
          (a) => a.id === nextEscalation.id,
        );

        if (alertConfig) {
          let duration = 0;
          let unit: "minutes" | "hours" | "days" = "minutes";

          if (nextEscalation.after !== undefined) {
            duration = nextEscalation.after.duration;
            unit = nextEscalation.after.unit;
          } else if (nextEscalation.deadline !== undefined) {
            const diffMs = Math.max(
              0,
              nextEscalation.resolvedDeadline - nextEscalation.baseTime,
            );
            duration = Math.round(diffMs / 60_000);
            unit = "minutes";
          }

          await sendEscalationAlert({
            definitionName: config.definitionName,
            resourceId: config.workflowId!,
            resourceType: config.resourceType,
            alertRuleId: nextEscalation.id,
            duration,
            durationUnit: unit,
            unit,
            firedAt: new Date().toISOString(),
            action: "sla_escalation",
            data: state.data,
            alertConfig,
          });
        }
      }

      if (state.currentStateId !== frozenStateId) {
        break;
      }
    }
  }
}

// ─── Main Workflow ────────────────────────────────────────────────────────────

export async function workflow(
  config: WorkflowConfig,
  initialData: Record<string, unknown> = {},
): Promise<WorkflowInstance> {
  const { finalStates, initialState } = config.stateMachine;

  const startTime = new Date().toISOString();

  const state: WorkflowState = {
    currentStateId: initialState,
    lastEventId: null,
    data: { ...initialData },
    history: [],
    triggeredEscalations: new Set<string>(),
    startTime,
    stateEntryTime: startTime,
  };

  const getInstance = () => buildInstance(config, state);

  registerHandlers(config, state, getInstance);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const isFinal = finalStates.includes(state.currentStateId);

    if (isFinal) {
      return getInstance();
    }

    await handleEscalations(config, state);

    if (state.currentStateId === initialState && state.history.length === 0) {
      await sleep("1 second");
    }

    await publishEvent({
      ...getInstance(),
      event: state.lastEventId!,
    });
  }
}
