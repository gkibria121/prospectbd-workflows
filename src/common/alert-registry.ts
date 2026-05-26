import { z } from "zod";
import {
  AlertRuleSchema,
  AppResourceSchema,
  type AlertRule,
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
  eventTrigger: "order-blocked",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Order {orderId} is BLOCKED (Status: {reason}). Manual intervention required to resolve.",
  isActive: true,
  createdAt: "2026-05-10T08:00:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    orderId: z.string(),
    reason: z.string(),
  }),
});

export const MISSING_ARTWORK_ALERT = defineAlertRule({
  id: "rule-2",
  name: "Missing Artwork Allocation",
  eventTrigger: "missing-artwork",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "Warning: Order {orderId} has no artwork jobs allocated after {timeElapsed} minutes. Customer/Admin notification pending.",
  isActive: true,
  createdAt: "2026-05-12T10:00:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    orderId: z.string(),
    timeElapsed: z.string(),
  }),
});

export const ARTWORK_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-3",
  name: "Artwork Job Not Accepted Escalation",
  eventTrigger: "artwork-job-not-accepted",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["artwork-designer"],
  template:
    "Warning: Artwork job {jobId} for Order {orderId} has not been accepted within the {timeLimit} minutes SLA threshold.",
  isActive: true,
  createdAt: "2026-05-13T14:30:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    orderId: z.string(),
    timeLimit: z.string(),
  }),
});

export const MISSING_PRODUCTION_ALERT = defineAlertRule({
  id: "rule-4",
  name: "Missing Production Job Dispatcher",
  eventTrigger: "missing-production",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: false },
  roles: ["admin"],
  template:
    "Warning: Paid Order {orderId} has no production jobs initialized after {timeElapsed} minutes. Pipeline check required.",
  isActive: true,
  createdAt: "2026-05-14T09:15:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    orderId: z.string(),
    timeElapsed: z.string(),
  }),
});

export const PRODUCTION_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-5",
  name: "Production Job Not Accepted Pager",
  eventTrigger: "production-job-not-accepted",
  severity: "CRITICAL",
  channels: { email: false, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} for Order {orderId} has not been accepted by any floor manager after {timeLimit} minutes.",
  isActive: true,
  createdAt: "2026-05-15T11:45:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    orderId: z.string(),
    timeLimit: z.string(),
  }),
});

export const MISSING_DELIVERY_ALERT = defineAlertRule({
  id: "rule-6",
  name: "Missing Delivery Dispatcher",
  eventTrigger: "missing-delivery",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Produced Order {orderId} has no delivery jobs initialized after {timeElapsed} minutes.",
  isActive: true,
  createdAt: "2026-05-16T16:20:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    orderId: z.string(),
    timeElapsed: z.string(),
  }),
});

export const DELIVERY_JOB_NOT_ACCEPTED_ALERT = defineAlertRule({
  id: "rule-7",
  name: "Delivery Job Not Accepted Warning",
  eventTrigger: "delivery-job-not-accepted",
  severity: "WARNING",
  channels: { email: false, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Dispatch Delivery job {jobId} for Order {orderId} has not been accepted by any driver after {timeLimit} minutes.",
  isActive: true,
  createdAt: "2026-05-16T18:00:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    orderId: z.string(),
    timeLimit: z.string(),
  }),
});

export const ARTWORK_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-art",
  name: "Artwork Job Expired/Rejected Alert",
  eventTrigger: "artwork-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "CRITICAL: Artwork job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:30:00.000Z",
  deduplicate: false,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    orderId: z.string(),
    action: z.string(),
    reason: z.string(),
  }),
});

export const PRODUCTION_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-prd",
  name: "Production Job Expired/Rejected Alert",
  eventTrigger: "production-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} ({jobType}) for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:35:00.000Z",
  deduplicate: false,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    jobType: z.string(),
    orderId: z.string(),
    action: z.string(),
    reason: z.string(),
  }),
});

export const DELIVERY_JOB_EXPIRED_REJECTED_ALERT = defineAlertRule({
  id: "rule-8-dlv",
  name: "Delivery Job Expired/Rejected Alert",
  eventTrigger: "delivery-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Delivery job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  isActive: true,
  createdAt: "2026-05-16T22:40:00.000Z",
  deduplicate: false,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    jobId: z.string(),
    orderId: z.string(),
    action: z.string(),
    reason: z.string(),
  }),
});

export const DELIVERY_OVERDUE_ALERT = defineAlertRule({
  id: "rule-9",
  name: "Critical Delivery Delay Tracker",
  eventTrigger: "delivery-overdue",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Order {orderId} is overdue for delivery. Assigned driver: {driverName}. Expected arrival was {expectedTime}.",
  isActive: true,
  createdAt: "2026-05-17T08:00:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    orderId: z.string(),
    driverName: z.string(),
    expectedTime: z.string(),
  }),
});

export const DB_MIGRATION_CLEAR_ALERT = defineAlertRule({
  id: "rule-10-success",
  name: "DB Migration Clear",
  eventTrigger: "migration-success",
  severity: "SUCCESS",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin"],
  template:
    "SUCCESS: Database schema migration {version} completed successfully. Active nodes: {nodeCount}.",
  isActive: true,
  createdAt: "2026-05-17T09:00:00.000Z",
  deduplicate: false,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    version: z.string(),
    nodeCount: z.string(),
  }),
});

export const DIAGNOSTIC_HEARTBEAT_ALERT = defineAlertRule({
  id: "rule-11-debug",
  name: "Diagnostic worker heartbeat",
  eventTrigger: "heartbeat-ping",
  severity: "DEBUG",
  channels: { email: false, sms: false, push: false, slack: true },
  roles: ["admin"],
  template:
    "DEBUG: Node {nodeId} returned diagnostic status {status} in {ms}ms. CPU usage: {cpu}%.",
  isActive: true,
  createdAt: "2026-05-17T09:10:00.000Z",
  deduplicate: true,
  payload: z.object({
    resourceType: AppResourceSchema,
    resourceId: z.string(),
    nodeId: z.string(),
    status: z.string(),
    ms: z.string(),
    cpu: z.string(),
  }),
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

/** Return all registered alert rules. */
export function getAllAlertRules(): AlertRule[] {
  return Object.values(ALERT_RULES_REGISTRY);
}
