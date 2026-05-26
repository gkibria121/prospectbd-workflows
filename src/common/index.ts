export * from "./workflow-schema";
export * from "./workflow-utils";
export * from "./registry";
export * from "./workflow-events";
export * from "./workflow.states";
export * from "./alert-registry";

import { WORKFLOW_SYSTEM } from "./registry";
export const getAlertRuleTemplateByName = WORKFLOW_SYSTEM.getAlertRuleTemplateByName;
export const getAlertRuleTemplatesByEvent = WORKFLOW_SYSTEM.getAlertRuleTemplatesByEvent;
export const getAllAlertRuleTemplates = WORKFLOW_SYSTEM.getAllAlertRuleTemplates;
export const ALERT_RULES_REGISTRY = WORKFLOW_SYSTEM.ALERT_RULES_REGISTRY;