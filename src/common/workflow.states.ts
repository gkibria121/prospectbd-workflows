import { WORKFLOW_SYSTEM } from "./registry";

export const WorkflowStateMap = WORKFLOW_SYSTEM.STATE_MAP;
export type WorkflowStateId = {
  [K in keyof typeof WorkflowStateMap]: keyof (typeof WorkflowStateMap)[K];
}[keyof typeof WorkflowStateMap];
