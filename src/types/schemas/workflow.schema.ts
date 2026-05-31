import { z } from "zod";
import { AppResourceSchema, UserRoleSchema } from "./rbac.schema";
import { ButtonVariantSchema } from "./button.schema";
import { AlertConfigSchema } from "./alert.schema";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const WorkFlowActionButtonSchema = z.object({
  eventId: z.string(),
  label: z.string(),
  icon: z.string(),
  variant: ButtonVariantSchema,
  requiredRoles: z.array(UserRoleSchema).optional(),
});

export type WorkflowAction = z.infer<typeof WorkFlowActionButtonSchema>;

export const EscalationSchema = z.discriminatedUnion("actionType", [
  z.object({
    id: z.string(),
    after: z.object({
      duration: z.number(),
      unit: z.enum(["minutes", "hours", "days"]),
    }),
    actionType: z.literal("raise-event"),
    eventId: z.string(),
  }),
  z.object({
    id: z.string(), // references AlertConfig.id
    after: z.object({
      duration: z.number(),
      unit: z.enum(["minutes", "hours", "days"]),
    }),
    actionType: z.literal("send-sla"),
  }),
]);

export type WorkflowEscalation = z.infer<typeof EscalationSchema>;

export const StateMachineStepSchema = z.object({
  state: z.string(),
  label: z.string(),
  description: z.string(),
  progress: z.number().min(0).max(100).default(0),
  requiredRoles: z.array(UserRoleSchema),
  actions: z.array(WorkFlowActionButtonSchema),
  escalations: z.array(EscalationSchema).optional().default([]),
});

export type WorkflowStateDefinition = z.infer<typeof StateMachineStepSchema>;

export const ActiveStepSchema = StateMachineStepSchema.extend({
  message: z.string().optional(),
});

export const WorkflowEventMetaSchema = z.object({
  eventId: z.string(),
  name: z.string(),
  icon: z.string(),
  schema: z.any().optional(), // For storing Zod schemas for payload validation
});

export type WorkflowEventMeta = z.infer<typeof WorkflowEventMetaSchema>;

export const WorkflowTransitionSchema = z.object({
  fromState: z.string(),
  toState: z.string(),
  eventId: z.string(),
});

export type WorkflowTransition = z.infer<typeof WorkflowTransitionSchema>;

export const WorkflowStateMachineSchema = z.object({
  initialState: z.string().min(1, "Initial state is required"),
  finalStates: z.array(z.string()).min(1, "One final state is required"),
  states: z
    .array(StateMachineStepSchema)
    .min(2, { message: "At least two states are required" }),
  transitions: z
    .array(WorkflowTransitionSchema)
    .min(1, "At least one transition is required"),
  escalations: z.array(EscalationSchema).optional().default([]),
});

export type WorkflowStateMachine = z.infer<typeof WorkflowStateMachineSchema>;

export const WorkflowConfigBaseSchema = z
  .object({
    events: z
      .array(WorkflowEventMetaSchema)
      .min(2, { message: "At two events are required" }),
    alerts: z.array(AlertConfigSchema).optional().default([]),
    stateMachine: WorkflowStateMachineSchema,
  })
  .superRefine((data, ctx) => {
    const { stateMachine, events, alerts } = data;

    const stateIds = new Set(stateMachine.states.map((s) => s.state));
    const eventIds = new Set(events.map((e) => e.eventId));

    // ── Duplicate alert ids ──────────────────────────────────────
    const seenAlertTriggers = new Set<string>();
    alerts.forEach((a, i) => {
      if (seenAlertTriggers.has(a.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["alerts", i, "id"],
          message: `Duplicate alert id: "${a.id}"`,
        });
      }
      seenAlertTriggers.add(a.id);
    });

    // ── Duplicate state IDs ────────────────────────────────────────────────
    const seenStates = new Set<string>();
    stateMachine.states.forEach((s, i) => {
      if (seenStates.has(s.state)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "states", i, "state"],
          message: `Duplicate state id: "${s.state}"`,
        });
      }
      seenStates.add(s.state);
    });

    // ── Duplicate event IDs ────────────────────────────────────────────────
    const seenEvents = new Set<string>();
    events.forEach((e, i) => {
      if (seenEvents.has(e.eventId)) {
        ctx.addIssue({
          code: "custom",
          path: ["events", i, "eventId"],
          message: `Duplicate event id: "${e.eventId}"`,
        });
      }
      seenEvents.add(e.eventId);
    });

    // ── initialState must exist in states ──────────────────────────────────
    if (!stateIds.has(stateMachine.initialState)) {
      ctx.addIssue({
        code: "custom",
        path: ["stateMachine", "initialState"],
        message: `Initial state "${stateMachine.initialState}" is not defined in states`,
      });
    }

    // ── finalStates must exist in states ───────────────────────────────────
    stateMachine.finalStates.forEach((fs, i) => {
      if (!stateIds.has(fs)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "finalStates", i],
          message: `Final state "${fs}" is not defined in states`,
        });
      }
    });

    // ── Duplicate finalStates ──────────────────────────────────────────────
    const seenFinalStates = new Set<string>();
    stateMachine.finalStates.forEach((fs, i) => {
      if (seenFinalStates.has(fs)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "finalStates", i],
          message: `Duplicate final state: "${fs}"`,
        });
      }
      seenFinalStates.add(fs);
    });

    // ── Transitions: fromState / toState must exist; eventId must exist ────
    stateMachine.transitions.forEach((t, i) => {
      if (t.fromState !== "" && !stateIds.has(t.fromState)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "transitions", i, "fromState"],
          message: `fromState "${t.fromState}" is not defined in states`,
        });
      }
      if (!stateIds.has(t.toState)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "transitions", i, "toState"],
          message: `toState "${t.toState}" is not defined in states`,
        });
      }
      if (!eventIds.has(t.eventId)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "transitions", i, "eventId"],
          message: `Transition eventId "${t.eventId}" is not defined in events`,
        });
      }
    });

    // ── Final states must not have outgoing transitions ────────────────────
    const finalStateSet = new Set(stateMachine.finalStates);
    stateMachine.transitions.forEach((t, i) => {
      if (finalStateSet.has(t.fromState)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "transitions", i, "fromState"],
          message: `Final state "${t.fromState}" must not have outgoing transitions`,
        });
      }
    });

    // ── Action button eventIds must be defined in events ───────────────────
    stateMachine.states.forEach((step, si) => {
      if (!finalStateSet.has(step.state) && step.actions.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "states", si, "actions"],
          message: `State "${step.state}" is not a final state and must have at least one action`,
        });
      }
      step.actions.forEach((btn, bi) => {
        if (!eventIds.has(btn.eventId)) {
          ctx.addIssue({
            code: "custom",
            path: ["stateMachine", "states", si, "actions", bi, "eventId"],
            message: `Action button eventId "${btn.eventId}" is not defined in events`,
          });
        }
      });
    });

    // ── Action button must have a matching transition from its state ───────
    stateMachine.states.forEach((step, si) => {
      step.actions.forEach((btn, bi) => {
        const hasTransition = stateMachine.transitions.some(
          (t) => t.fromState === step.state && t.eventId === btn.eventId,
        );
        if (!hasTransition) {
          ctx.addIssue({
            code: "custom",
            path: ["stateMachine", "states", si, "actions", bi, "eventId"],
            message: `Action button "${btn.eventId}" on state "${step.state}" has no matching transition`,
          });
        }
      });
    });

    // ── Every event used in transitions must appear on the fromState's action buttons ──
    // (ensures transitions are reachable from the UI, unless they are system-triggered via escalations)
    stateMachine.transitions.forEach((t, i) => {
      const fromStep = stateMachine.states.find((s) => s.state === t.fromState);
      if (!fromStep) return; // already caught above
      const buttonEventIds = new Set(fromStep.actions.map((b) => b.eventId));

      if (!buttonEventIds.has(t.eventId)) {
        // Check if this event is triggered by ANY escalation (global or state-specific to this state)
        const isTriggeredByEscalation =
          (stateMachine.escalations ?? []).some(
            (e) =>
              e.actionType === "raise-event" && e.eventId === t.eventId,
          ) ||
          (fromStep.escalations ?? []).some(
            (e) =>
              e.actionType === "raise-event" && e.eventId === t.eventId,
          );

        if (!isTriggeredByEscalation) {
          ctx.addIssue({
            code: "custom",
            path: ["stateMachine", "transitions", i, "eventId"],
            message: `Transition event "${t.eventId}" from state "${t.fromState}" has no corresponding action button on that state and is not triggered by an escalation`,
          });
        }
      }
    });

    // ── A fromState cannot have the same eventId in multiple transitions ───
    const transitionMap = new Map<string, string>(); // key: `${fromState}::${eventId}` → toState

    stateMachine.transitions.forEach((t, i) => {
      const key = `${t.fromState}::${t.eventId}`;

      if (transitionMap.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["stateMachine", "transitions", i, "eventId"],
          message: `State "${t.fromState}" already has a transition for event "${t.eventId}"`,
        });
      } else {
        transitionMap.set(key, t.toState);
      }
    });

    // ── Escalation Validation ──────────────────────────────────────────────

    // 1. Check global escalations
    const globalEscalations = stateMachine.escalations ?? [];
    const nonFinalStates = stateMachine.states.filter(
      (s) => !finalStateSet.has(s.state),
    );

    globalEscalations.forEach((esc, ei) => {
      if (esc.actionType === "raise-event") {
        const eventId = esc.eventId;

        const eventMeta = events.find((e) => e.eventId === eventId);
        if (!eventMeta) {
          ctx.addIssue({
            code: "custom",
            path: ["stateMachine", "escalations", ei, "eventId"],
            message: `Global escalation eventId "${eventId}" is not defined in events`,
          });
        } else {
          // Verify that ALL non-final states have a transition for this event
          nonFinalStates.forEach((step) => {
            const hasTransition = stateMachine.transitions.some(
              (t) => t.fromState === step.state && t.eventId === eventId,
            );
            if (!hasTransition) {
              ctx.addIssue({
                code: "custom",
                path: ["stateMachine", "escalations", ei, "eventId"],
                message: `Global escalation event "${eventId}" has no transition defined from state "${step.state}"`,
              });
            }
          });
        }
      }
    });

    // 2. Check state-specific escalations
    stateMachine.states.forEach((step, si) => {
      const stepEscalations = step.escalations ?? [];
      stepEscalations.forEach((esc, ei) => {
        if (esc.actionType === "raise-event") {
        const eventId = esc.eventId;
          const eventMeta = events.find((e) => e.eventId === eventId);
          if (!eventMeta) {
            ctx.addIssue({
              code: "custom",
              path: [
                "stateMachine",
                "states",
                si,
                "escalations",
                ei,
                "eventId",
              ],
              message: `Escalation eventId "${eventId}" on state "${step.state}" is not defined in events`,
            });
          } else {
            // Verify that THIS state has a transition for this event
            const hasTransition = stateMachine.transitions.some(
              (t) => t.fromState === step.state && t.eventId === eventId,
            );
            if (!hasTransition) {
              ctx.addIssue({
                code: "custom",
                path: [
                  "stateMachine",
                  "states",
                  si,
                  "escalations",
                  ei,
                  "eventId",
                ],
                message: `Escalation event "${eventId}" on state "${step.state}" has no matching transition`,
              });
            }
          }
        }
      });
    });
  });
const WorkflowIdSchema = z.uuid();
export const WorkflowConfigSchema = WorkflowConfigBaseSchema.extend({
  workflowId: WorkflowIdSchema.optional(),
  resourceType: AppResourceSchema,
  definitionName: z.string(),
});

export const WorkflowHistoryItemSchema = z.object({
  eventId: z.string(),
  fromStep: z.string().nullable(),
  toStep: z.string(),
  data: z.record(z.string(), z.unknown()),
  label: z.string().optional(),
  timestamp: z.string(),
});

export const WorkflowInstanceSchema = z.object({
  workflowId: WorkflowIdSchema,
  definitionName: z.string(),
  resourceType: AppResourceSchema,
  currentState: StateMachineStepSchema.optional(),
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
  history: z.array(WorkflowHistoryItemSchema),
});

export const TriggerEventPayloadSchema = z.object({
  workflowId: WorkflowIdSchema,
  eventId: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  userRoles: z.array(UserRoleSchema).optional(),
});

export const EscalationAlertPayloadSchema = z.object({
  definitionName: z.string(),
  resourceId: WorkflowIdSchema,
  resourceType: AppResourceSchema,
  alertRuleId: z.string(),
  duration: z.number(),
  unit: z.enum(["minutes", "hours", "days"]),
  firedAt: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const WorkflowTemplateSchema = z
  .object({
    id: z.string(),
    definitionName: z.string().min(1, "Definition name is required"),
    version: z.number(),
    isActive: z.boolean(),
  })
  .extend({
    config: WorkflowConfigBaseSchema,
  });

export type WorkFlowActionButton = z.infer<typeof WorkFlowActionButtonSchema>;
export type WorkFlowStep = z.infer<typeof StateMachineStepSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;
export type WorkflowInstance = z.infer<typeof WorkflowInstanceSchema>;
export type TriggerEventPayload = z.infer<typeof TriggerEventPayloadSchema>;
export type EscalationAlertPayload = z.infer<
  typeof EscalationAlertPayloadSchema
>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

export type InferWorkflowStates<T extends WorkflowConfig> =
  T["stateMachine"]["states"][number]["state"];
export type InferWorkflowEvents<T extends WorkflowConfig> =
  T["events"][number]["eventId"];
export type InferEventPayload<
  T extends WorkflowConfig,
  E extends T["events"][number]["eventId"],
> =
  Extract<T["events"][number], { eventId: E }> extends {
    schema: z.ZodType<infer P>;
  }
    ? P
    : Record<string, unknown>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowState = z.infer<typeof StateMachineStepSchema>;
export type WorkflowHistory = z.infer<typeof WorkflowInstanceSchema>["history"];
export type WorkflowActiveState = z.infer<typeof ActiveStepSchema>;
export const workflowBaseDtoSchema = z.object({
  config: WorkflowConfigSchema,
  activeState: ActiveStepSchema.optional().nullable(),
  history: z.array(WorkflowHistoryItemSchema).default([]),
  progress: z.union([z.number(), z.string()]).optional().nullable(),
});

export type WorkflowDto = z.infer<typeof workflowBaseDtoSchema>;
