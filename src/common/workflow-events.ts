import { z } from "zod";
import { InferEventPayload } from "../types";
import { WORKFLOW_SYSTEM, WORKFLOWS } from "./registry";

/** type-safe union of all possible namespaced event IDs */
export type WorkflowEventId = {
  [K in keyof typeof WORKFLOWS]: (typeof WORKFLOWS)[K]["Events"][keyof (typeof WORKFLOWS)[K]["Events"]];
}[keyof typeof WORKFLOWS];

/**
 * Derives the payload type for any valid namespaced event ID.
 * Automatically looks up the Zod schema defined in the workflow of origin.
 */
export type GetEventPayload<E extends WorkflowEventId> = {
  [K in keyof typeof WORKFLOWS]: E extends `${(typeof WORKFLOWS)[K]["definitionName"]}.${infer ShortId}`
    ? ShortId extends (typeof WORKFLOWS)[K]["events"][number]["eventId"]
      ? InferEventPayload<(typeof WORKFLOWS)[K], ShortId>
      : never
    : never;
}[keyof typeof WORKFLOWS];

/**
 * Zod schema for validating any workflow event ID in the system.
 */
export const WorkflowEventIdSchema = z.enum(
  WORKFLOW_SYSTEM.EVENT_IDS as [string, ...string[]],
);

/**
 * Convenience map for using event IDs in code.
 * Automatically updated whenever a new workflow is added to the system.
 * Example: WorkflowEventIdMap.order.PAID_CONFIRMED -> "standard-order-flow.PAID_CONFIRMED"
 */
export const WorkflowEventIdMap = WORKFLOW_SYSTEM.EVENT_MAP;
export const WorkflowAlerts = WORKFLOW_SYSTEM.ALERT_MAP;

export type PublishWorkflowEventPayload = {
  [E in WorkflowEventId]: {
    workflowId: string;
    eventId: E;
    data: GetEventPayload<E>;
  };
}[WorkflowEventId];

export function getRequiredEvent<
  K extends keyof typeof WORKFLOWS,
  S extends (typeof WORKFLOWS)[K]["stateMachine"]["states"][number]["state"],
>(key: K, state: S) {
  const workflow = WORKFLOWS[key];

  const targetTransition = workflow.stateMachine.transitions.find(
    (value) => value.toState === state,
  );

  if (!targetTransition) {
    throw new Error(
      `No transition found to state "${state}" in workflow "${workflow.definitionName}"`,
    );
  }

  return WorkflowEventIdMap[key][targetTransition.eventId];
}
