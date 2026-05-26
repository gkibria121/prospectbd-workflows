import { z } from "zod";
import {
  AlertRuleTemplateDefineSchema,
  AppResourceSchema,
  type AlertRuleTemplateDefine,
} from "../types";

// ─── Factory ─────────────────────────────────────────────────────────────────

export const ORDER_BLOCKED_ALERT: AlertRuleTemplateDefine = {
  name: "Order Blocked SLA Alert",
  eventTrigger: "order-blocked",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Order {orderId} is BLOCKED (Status: {reason}). Manual intervention required to resolve.",

  deduplicate: true,
};

export const MISSING_ARTWORK_ALERT: AlertRuleTemplateDefine = {
  name: "Missing Artwork Allocation",
  eventTrigger: "missing-artwork",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "Warning: Order {orderId} has no artwork jobs allocated after {timeElapsed} minutes. Customer/Admin notification pending.",

  deduplicate: true,
};

export const ARTWORK_JOB_NOT_ACCEPTED_ALERT: AlertRuleTemplateDefine = {
  name: "Artwork Job Not Accepted Escalation",
  eventTrigger: "artwork-job-not-accepted",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["artwork-designer"],
  template:
    "Warning: Artwork job {jobId} for Order {orderId} has not been accepted within the {timeLimit} minutes SLA threshold.",

  deduplicate: true,
};

export const MISSING_PRODUCTION_ALERT: AlertRuleTemplateDefine = {
  name: "Missing Production Job Dispatcher",
  eventTrigger: "missing-production",
  severity: "WARNING",
  channels: { email: true, sms: false, push: true, slack: false },
  roles: ["admin"],
  template:
    "Warning: Paid Order {orderId} has no production jobs initialized after {timeElapsed} minutes. Pipeline check required.",

  deduplicate: true,
};

export const PRODUCTION_JOB_NOT_ACCEPTED_ALERT: AlertRuleTemplateDefine = {
  name: "Production Job Not Accepted Pager",
  eventTrigger: "production-job-not-accepted",
  severity: "CRITICAL",
  channels: { email: false, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} for Order {orderId} has not been accepted by any floor manager after {timeLimit} minutes.",
  deduplicate: true,
};

export const MISSING_DELIVERY_ALERT: AlertRuleTemplateDefine = {
  name: "Missing Delivery Dispatcher",
  eventTrigger: "missing-delivery",
  severity: "WARNING",
  channels: { email: true, sms: false, push: false, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Produced Order {orderId} has no delivery jobs initialized after {timeElapsed} minutes.",
  deduplicate: true,
};

export const DELIVERY_JOB_NOT_ACCEPTED_ALERT: AlertRuleTemplateDefine = {
  name: "Delivery Job Not Accepted Warning",
  eventTrigger: "delivery-job-not-accepted",
  severity: "WARNING",
  channels: { email: false, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "Warning: Dispatch Delivery job {jobId} for Order {orderId} has not been accepted by any driver after {timeLimit} minutes.",
  deduplicate: true,
};

export const ARTWORK_JOB_EXPIRED_REJECTED_ALERT: AlertRuleTemplateDefine = {
  name: "Artwork Job Expired/Rejected Alert",
  eventTrigger: "artwork-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "artwork-designer"],
  template:
    "CRITICAL: Artwork job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  deduplicate: false,
};

export const PRODUCTION_JOB_EXPIRED_REJECTED_ALERT: AlertRuleTemplateDefine = {
  name: "Production Job Expired/Rejected Alert",
  eventTrigger: "production-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin"],
  template:
    "CRITICAL: Production job {jobId} ({jobType}) for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  deduplicate: false,
};

export const DELIVERY_JOB_EXPIRED_REJECTED_ALERT: AlertRuleTemplateDefine = {
  name: "Delivery Job Expired/Rejected Alert",
  eventTrigger: "delivery-job-expired-rejected",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: true },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Delivery job {jobId} for Order {orderId} has been {action} (Expired/Rejected). Reason: {reason}.",
  deduplicate: false,
};

export const DELIVERY_OVERDUE_ALERT: AlertRuleTemplateDefine = {
  name: "Critical Delivery Delay Tracker",
  eventTrigger: "delivery-overdue",
  severity: "CRITICAL",
  channels: { email: true, sms: true, push: true, slack: false },
  roles: ["admin", "delivery-person"],
  template:
    "CRITICAL: Order {orderId} is overdue for delivery. Assigned driver: {driverName}. Expected arrival was {expectedTime}.",
  deduplicate: true,
};

export const DB_MIGRATION_CLEAR_ALERT: AlertRuleTemplateDefine = {
  name: "DB Migration Clear",
  eventTrigger: "migration-success",
  severity: "SUCCESS",
  channels: { email: true, sms: false, push: true, slack: true },
  roles: ["admin"],
  template:
    "SUCCESS: Database schema migration {version} completed successfully. Active nodes: {nodeCount}.",
  deduplicate: false,
};

export const DIAGNOSTIC_HEARTBEAT_ALERT: AlertRuleTemplateDefine = {
  name: "Diagnostic worker heartbeat",
  eventTrigger: "heartbeat-ping",
  severity: "DEBUG",
  channels: { email: false, sms: false, push: false, slack: true },
  roles: ["admin"],
  template:
    "DEBUG: Node {nodeId} returned diagnostic status {status} in {ms}ms. CPU usage: {cpu}%.",
  deduplicate: true,
};
