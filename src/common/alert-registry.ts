import {
  AlertRuleSchema,
  AlertRuleEventSchema,
  type AlertRule,
  type AlertRuleEvent,
} from "../types";

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Validates an alert rule definition at import time using the shared Zod schema.
 * Mirrors `defineWorkflow` – any schema violation throws immediately so
 * misconfigurations surface during startup, not at runtime.
 */
function defineAlertRule<const T extends AlertRule>(config: T): T {
  const result = AlertRuleSchema.safeParse(config);
  if (!result.success) {
    const msgs = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Invalid AlertRule definition "${config.name}": ${msgs}`,
    );
  }
  return config;
}

// ─── Rule Definitions ────────────────────────────────────────────────────────

export const ORDER_BLOCKED_ALERT = defineAlertRule({
  id: "rule-1",
  name: "Order Blocked SLA Alert",
  eventTrigger: "Order Blocked",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Order {orderId} is BLOCKED (Status: {reason}). Manual intervention required to resolve.",
  isActive: true,
  createdAt: "2026-05-10T08:00:00.000Z",
  deduplicate: true,
});

export const MISSING_ARTWORK_ALERT = defineAlertRule({
  id: "rule-2",
  name: "Missing Artwork Allocation",
  eventTrigger: "Missing Artwork",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "Warning: Order {orderId} has no artwork jobs allocated after {timeElapsed} minutes. Customer/Admin notification pending.",
  isActive: true,
  createdAt: "2026-05-12T10:00:00.000Z",
  deduplicate: true,
});

export const ARTWORK_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-3",
  name: "Artwork Job Not Accepted Escalation",
  eventTrigger: "Artwork Job Not Accepted",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["artwork-designer"],
  template:
    "Warning: Artwork job {jobId} for Order {orderId} has not been accepted within the {timeLimit} minutes SLA threshold.",
  isActive: true,
  createdAt: "2026-05-13T14:30:00.000Z",
  deduplicate: true,
});

export const MISSING_PRODUCTION_ALERT = defineAlertRule({
  id: "rule-4",
  name: "Missing Production Job Dispatcher",
  eventTrigger: "Missing Production",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: false },
  roles: ["admin"],
  template:
    "Warning: Paid Order {orderId} has no production jobs initialized after {timeElapsed} minutes. Pipeline check required.",
  isActive: true,
  createdAt: "2026-05-14T09:15:00.000Z",
  deduplicate: true,
});

export const PRODUCTION_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-5",
  name: "Production Job Not Accepted Pager",
  eventTrigger: "Production Job Not Accepted",
  severity: "CRITICAL",
  channels: { email: false, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} for Order {orderId} has not been accepted by any floor manager after {timeLimit} minutes.",
  isActive: true,
  createdAt: "2026-05-15T11:45:00.000Z",
  deduplicate: true,
});

export const MISSING_DELIVERY_ALERT = defineAlertRule({
  id: "rule-6",
  name: "Missing Delivery Dispatcher",
  eventTrigger: "Missing Delivery",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Produced Order {orderId} has no delivery jobs initialized after {timeElapsed} minutes.",
  isActive: true,
  createdAt: "2026-05-16T16:20:00.000Z",
  deduplicate: true,
});

export const DELIVERY_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-7",
  name: "Delivery Job Not Accepted Warning",
  eventTrigger: "Delivery Job Not Accepted",
  severity: "WARNING",
  channels: { email: false, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Dispatch Delivery job {jobId} for Order {orderId} has not been accepted by any driver after {timeLimit} minutes.",
  isActive: true,
  createdAt: "2026-05-16T18:00:00.000Z",
  deduplicate: true,
});

export const ARTWORK_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-art",
  name: "Artwork Job Expired/Rejected Alert",
  eventTrigger: "Artwork Job Expired Rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "CRITICAL: Artwork job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:30:00.000Z",
  deduplicate: false,
});

export const PRODUCTION_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-prd",
  name: "Production Job Expired/Rejected Alert",
  eventTrigger: "Production Job Expired Rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} ({jobType}) for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:35:00.000Z",
  deduplicate: false,
});

export const DELIVERY_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-dlv",
  name: "Delivery Job Expired/Rejected Alert",
  eventTrigger: "Delivery Job Expired Rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Delivery job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:40:00.000Z",
  deduplicate: false,
});

export const DELIVERY_OVERDUE_ALERT = defineAlertRule({
  id: "rule-9",
  name: "Critical Delivery Delay Tracker",
  eventTrigger: "Delivery Overdue",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Order {orderId} is overdue for delivery. Assigned driver: {driverName}. Expected arrival was {expectedTime}.",
  isActive: true,
  createdAt: "2026-05-17T08:00:00.000Z",
  deduplicate: true,
});

export const DB_MIGRATION_CLEAR_ALERT = defineAlertRule({
  id: "rule-10-success",
  name: "DB Migration Clear",
  eventTrigger: "Migration Success",
  severity: "SUCCESS",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin"],
  template:
    "SUCCESS: Database schema migration {version} completed successfully. Active nodes: {nodeCount}.",
  isActive: true,
  createdAt: "2026-05-17T09:00:00.000Z",
  deduplicate: false,
});

export const DIAGNOSTIC_HEARTBEAT_ALERT = defineAlertRule({
  id: "rule-11-debug",
  name: "Diagnostic worker heartbeat",
  eventTrigger: "Heartbeat Ping",
  severity: "DEBUG",
  channels: { email: false, sms: false, push: false, slack: true },
  roles: ["admin"],
  template:
    "DEBUG: Node {nodeId} returned diagnostic status {status} in {ms}ms. CPU usage: {cpu}%.",
  isActive: true,
  createdAt: "2026-05-17T09:10:00.000Z",
  deduplicate: true,
});

// ─── Registry ────────────────────────────────────────────────────────────────

/** All alert rules, keyed by their unique `id`. */
export const ALERT_RULES_REGISTRY: Record<string, AlertRule> = {
  [ORDER_BLOCKED_ALERT.id]: ORDER_BLOCKED_ALERT,
  [MISSING_ARTWORK_ALERT.id]: MISSING_ARTWORK_ALERT,
  [ARTWORK_JOB_NOT_ACCEPTED_ALERT.id]: ARTWORK_JOB_NOT_ACCEPTED_ALERT,
  [MISSING_PRODUCTION_ALERT.id]: MISSING_PRODUCTION_ALERT,
  [PRODUCTION_JOB_NOT_ACCEPTED_ALERT.id]: PRODUCTION_JOB_NOT_ACCEPTED_ALERT,
  [MISSING_DELIVERY_ALERT.id]: MISSING_DELIVERY_ALERT,
  [DELIVERY_JOB_NOT_ACCEPTED_ALERT.id]: DELIVERY_JOB_NOT_ACCEPTED_ALERT,
  [ARTWORK_JOB_EXPIRED_REJECTED_ALERT.id]: ARTWORK_JOB_EXPIRED_REJECTED_ALERT,
  [PRODUCTION_JOB_EXPIRED_REJECTED_ALERT.id]: PRODUCTION_JOB_EXPIRED_REJECTED_ALERT,
  [DELIVERY_JOB_EXPIRED_REJECTED_ALERT.id]: DELIVERY_JOB_EXPIRED_REJECTED_ALERT,
  [DELIVERY_OVERDUE_ALERT.id]: DELIVERY_OVERDUE_ALERT,
  [DB_MIGRATION_CLEAR_ALERT.id]: DB_MIGRATION_CLEAR_ALERT,
  [DIAGNOSTIC_HEARTBEAT_ALERT.id]: DIAGNOSTIC_HEARTBEAT_ALERT,
};

// ─── Event Definitions (simulation payloads) ─────────────────────────────────

export const ALERT_EVENTS_REGISTRY: AlertRuleEvent[] = [
  {
    event: "Order Blocked",
    payload: { orderId: "DNP-6671", reason: "Artwork Quality Verification Failed" },
  },
  {
    event: "Missing Artwork",
    payload: { orderId: "DNP-1082", timeElapsed: "60" },
  },
  {
    event: "Artwork Job Not Accepted",
    payload: { jobId: "ART-5512", orderId: "DNP-1082", timeLimit: "30" },
  },
  {
    event: "Missing Production",
    payload: { orderId: "DNP-3044", timeElapsed: "45" },
  },
  {
    event: "Production Job Not Accepted",
    payload: { jobId: "PRD-8890", orderId: "DNP-3044", timeLimit: "20" },
  },
  {
    event: "Missing Delivery",
    payload: { orderId: "DNP-9912", timeElapsed: "40" },
  },
  {
    event: "Delivery Job Not Accepted",
    payload: { jobId: "DLV-2210", orderId: "DNP-9912", timeLimit: "15" },
  },
  {
    event: "Artwork Job Expired Rejected",
    payload: {
      jobId: "ART-9011",
      orderId: "DNP-5509",
      action: "REJECTED",
      reason: "Proof rejected by customer due to color mismatch",
    },
  },
  {
    event: "Production Job Expired Rejected",
    payload: {
      jobId: "PRD-1092",
      jobType: "Banner Binding",
      orderId: "DNP-4011",
      action: "EXPIRED",
      reason: "Station timeout without response",
    },
  },
  {
    event: "Delivery Job Expired Rejected",
    payload: {
      jobId: "DLV-3044",
      orderId: "DNP-7712",
      action: "REJECTED",
      reason: "Driver vehicle breakdown",
    },
  },
  {
    event: "Delivery Overdue",
    payload: { orderId: "DNP-8924", driverName: "Sarah Connor", expectedTime: "12:15 PM" },
  },
  {
    event: "Migration Success",
    payload: { version: "v2.4.2", nodeCount: "16" },
  },
  {
    event: "Heartbeat Ping",
    payload: { nodeId: "api-gateway-03", status: "HEALTHY", ms: "8", cpu: "14" },
  },
];

// Attach rule names to events for display purposes
ALERT_EVENTS_REGISTRY.forEach((evt) => {
  const matchingRule = Object.values(ALERT_RULES_REGISTRY).find(
    (r) => r.eventTrigger === evt.event,
  );
  if (matchingRule) {
    evt.ruleName = matchingRule.name;
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Look up a single rule by its unique `id`. */
export function getAlertRuleById(id: string): AlertRule | undefined {
  return ALERT_RULES_REGISTRY[id];
}

/** Return all active rules that match the given event trigger. */
export function getAlertRulesByEvent(eventTrigger: string): AlertRule[] {
  return Object.values(ALERT_RULES_REGISTRY).filter(
    (r) => r.eventTrigger === eventTrigger && r.isActive,
  );
}

/** Return every registered simulation event. */
export function getAlertRuleEvents(): AlertRuleEvent[] {
  return ALERT_EVENTS_REGISTRY;
}

/** Return all registered alert rules. */
export function getAllAlertRules(): AlertRule[] {
  return Object.values(ALERT_RULES_REGISTRY);
}
