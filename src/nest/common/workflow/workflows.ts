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
  triggeredEscalations: string[];
  startTime: string;
  stateEntryTime: string;
  escalationFiredTimes?: Record<string, number>;
}

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
  if (state.escalationFiredTimes) {
    const globalIds = new Set(
      (config.stateMachine.escalations ?? []).map((e) => e.id),
    );
    for (const key of Object.keys(state.escalationFiredTimes)) {
      if (!globalIds.has(key)) {
        delete state.escalationFiredTimes[key];
      }
    }
  }
  state.lastEventId = fullEventId;
  state.data = { ...state.data, ...eventData };

  console.log(
    `[Workflow: ${config.definitionName}] Transitioned: ${fromStep} --(${fullEventId})--> ${toStep}`,
  );
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

  /*
  console.log(
    `[Workflow: ${config.definitionName}] Entered escalation loop for state "${state.currentStateId}"`,
  );
*/

  while (true) {
    const frozenStateId = state.currentStateId;

    // 1. Get all active escalations
    const stepEscalations =
      config.stateMachine.states.find((s) => s.state === frozenStateId)
        ?.escalations ?? [];
    const globalEscalations = config.stateMachine.escalations ?? [];

    const activeEscalations = [
      ...stepEscalations.map((e) => ({
        ...e,
        baseTime: stateEntryTime,
        level: "step",
      })),
      ...globalEscalations.map((e) => ({
        ...e,
        baseTime: workflowStartTime,
        level: "global",
      })),
    ].filter((e) => !state.triggeredEscalations.includes(e.id));

    if (activeEscalations.length === 0) {
      await condition(() => state.currentStateId !== frozenStateId);

      break;
    }

    // 2. Find the earliest escalation
    const now = new Date().getTime();
    const withDeadlines = activeEscalations
      .map((e) => {
        let deadlineVal: number;
        let origDeadlineVal: number;
        if (e.deadline !== undefined) {
          if (e.deadline instanceof Date) {
            origDeadlineVal = e.deadline.getTime();
          } else {
            const deadlineField = e.deadline;
            const dataVal = state.data[deadlineField];
            const finalVal = dataVal !== undefined ? dataVal : deadlineField;
            if (finalVal instanceof Date) {
              origDeadlineVal = finalVal.getTime();
            } else {
              const dateStr =
                typeof finalVal === "string" ? finalVal : String(finalVal);
              const parsed = Date.parse(dateStr);
              if (!isNaN(parsed)) {
                origDeadlineVal = parsed;
              } else {
                origDeadlineVal = Infinity;
              }
            }
          }
        } else if (e.after !== undefined) {
          origDeadlineVal =
            e.baseTime + durationToMs(e.after.duration, e.after.unit);
        } else {
          origDeadlineVal = Infinity;
        }

        const lastFired = state.escalationFiredTimes?.[e.id];
        if (lastFired !== undefined && origDeadlineVal !== Infinity) {
          const durationMs = Math.max(0, origDeadlineVal - e.baseTime);
          deadlineVal = lastFired + durationMs;
        } else {
          deadlineVal = origDeadlineVal;
        }

        return {
          ...e,
          resolvedDeadline: deadlineVal,
        };
      })
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

    // 3. Timed out — Fire escalation
    if (!resolved) {
      if (nextEscalation.actionType === "raise-event") {
        // Mark raise-event escalations as triggered — they cause a state
        // transition and must not fire again for the same state.
        state.triggeredEscalations.push(nextEscalation.id);

        applyTransition(config, state, {
          workflowId: config.workflowId!,
          eventId: nextEscalation.eventId,
          data: {
            resourceType: config.resourceType,
            id: config.workflowId!, // Use full ID as it is now a UUID
            escalationId: nextEscalation.id,
            timestamp: new Date().toISOString(),
          },
          userRoles: ["admin"], // System triggered
        });
      } else if (nextEscalation.actionType === "send-sla") {
        const alertConfig = config.alerts?.find(
          (a) => a.id === nextEscalation.id,
        );

        if (alertConfig) {
          let duration = 0;
          let unit: "minutes" | "hours" | "days" = "minutes";
          const diffMs = Math.max(
            0,
            nextEscalation.resolvedDeadline - nextEscalation.baseTime,
          );
          if (nextEscalation.after !== undefined) {
            if (nextEscalation.after.unit === "minutes") {
              duration = Math.round(diffMs / 60_000);
            } else if (nextEscalation.after.unit === "hours") {
              duration = Math.round(diffMs / 3_600_000);
            } else if (nextEscalation.after.unit === "days") {
              duration = Math.round(diffMs / 86_400_000);
            }
            unit = nextEscalation.after.unit;
          } else if (nextEscalation.deadline !== undefined) {
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

          if (alertConfig.deduplicate !== true) {
            state.triggeredEscalations.push(nextEscalation.id);
          } else {
            if (!state.escalationFiredTimes) {
              state.escalationFiredTimes = {};
            }
            state.escalationFiredTimes[nextEscalation.id] = new Date().getTime();
          }
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
    triggeredEscalations: [],
    startTime: startTime,
    stateEntryTime: startTime,
    escalationFiredTimes: {},
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

    // After transition, we always publish exactly once
    await publishEvent({
      ...getInstance(),
      event: state.lastEventId!,
    });
  }
}
