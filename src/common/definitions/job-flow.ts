import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

export const JOB_FLOW_CONFIG = defineWorkflow({
  definitionName: "job-lifecycle",
  resourceType: "order-job",

  events: [
    { eventId: "JOB_CREATED", name: "Create Job", icon: "📋" },
    {
      eventId: "JOB_ACCEPTED",
      name: "Accept Job",
      icon: "✅",
    },
    {
      eventId: "JOB_REJECTED",
      name: "Reject Job",
      icon: "❌",
    },
    {
      eventId: "JOB_EXPIRED",
      name: "Expire Job",
      icon: "⏳",
    },
    {
      eventId: "JOB_COMPLETED",
      name: "Complete Job",
      icon: "🎉",
    },
    {
      eventId: "JOB_CANCELLED",
      name: "Cancel Job",
      icon: "🚫",
    },
  ],
  alerts: [
    {
      name: "Artwork Job Not Accepted Escalation",
      id: "artwork-job-not-accepted",
      severity: "WARNING",
      channels: { email: true, sms: false, push: false, slack: true },
      roles: ["artwork-designer"],
      template:
        "Warning: Artwork job {jobNo} for Order {orderNo} has not been accepted within the {timeLimit} minutes SLA threshold.",
      deduplicate: true,
    },
    {
      name: "Production Job Not Accepted Pager",
      id: "production-job-not-accepted",
      severity: "CRITICAL",
      channels: { email: false, sms: true, push: true, slack: true },
      roles: ["admin"],
      template:
        "CRITICAL: Production job {jobNo} for Order {orderNo} has not been accepted by any floor manager after {timeLimit} minutes.",
      deduplicate: true,
    },
    {
      name: "Delivery Job Not Accepted Warning",
      id: "delivery-job-not-accepted",
      severity: "WARNING",
      channels: { email: false, sms: true, push: true, slack: false },
      roles: ["admin", "delivery-person"],
      template:
        "Warning: Dispatch Delivery job {jobNo} for Order {orderNo} has not been accepted by any driver after {timeLimit} minutes.",
      deduplicate: true,
    },
    {
      name: "Artwork Job Expired/Rejected Alert",
      id: "artwork-job-expired-rejected",
      severity: "CRITICAL",
      channels: { email: true, sms: true, push: true, slack: true },
      roles: ["admin", "artwork-designer"],
      template:
        "CRITICAL: Artwork job {jobNo} for Order {orderNo} has been {action} (Expired/Rejected). Reason: {reason}.",
      deduplicate: false,
    },
    {
      name: "Production Job Expired/Rejected Alert",
      id: "production-job-expired-rejected",
      severity: "CRITICAL",
      channels: { email: true, sms: true, push: true, slack: true },
      roles: ["admin"],
      template:
        "CRITICAL: Production job {jobNo} ({jobType}) for Order {orderNo} has been {action} (Expired/Rejected). Reason: {reason}.",
      deduplicate: false,
    },
    {
      name: "Delivery Job Expired/Rejected Alert",
      id: "delivery-job-expired-rejected",
      severity: "CRITICAL",
      channels: { email: true, sms: true, push: true, slack: true },
      roles: ["admin", "delivery-person"],
      template:
        "CRITICAL: Delivery job {jobNo} for Order {orderNo} has been {action} (Expired/Rejected). Reason: {reason}.",
      deduplicate: false,
    },
  ],
  stateMachine: {
    initialState: "AWAITING_ACCEPTANCE",
    finalStates: ["REJECTED", "EXPIRED", "COMPLETED", "CANCELLED"],

    states: [
      {
        state: "AWAITING_ACCEPTANCE",
        label: "Awaiting Acceptance",
        progress: 5,
        description: "Job has been created and is pending assignee acceptance.",
        requiredRoles: [
          "vendor",
          "admin",
          "artwork-designer",
          "delivery-person",
        ],
        actions: [
          {
            eventId: "JOB_ACCEPTED",
            label: "Accept Job",
            icon: "✅",
            variant: "greenSuccess",
          },
          {
            eventId: "JOB_REJECTED",
            label: "Reject Job",
            icon: "❌",
            variant: "redDanger",
          },
          {
            eventId: "JOB_EXPIRED",
            label: "Expire",
            icon: "⏳",
            variant: "grayOutline",
            requiredRoles: ["system"],
          },
          {
            eventId: "JOB_CANCELLED",
            label: "Cancel Job",
            icon: "🚫",
            variant: "graySecondary",
            requiredRoles: ["admin"],
          },
        ],
        escalations: [
          {
            id: "job-acceptance-warning",
            label: "Job Acceptance Warning",
            after: { duration: 30, unit: "minutes" },
            actionType: "send-sla",
          },
          {
            id: "job-expiry",
            label: "Job Auto-Expiration",
            after: { duration: 24, unit: "hours" },
            actionType: "raise-event",
            eventId: "JOB_EXPIRED",
          },
        ],
      },
      {
        state: "ACCEPTED",
        label: "Accepted",
        progress: 10,
        description: "Job has been accepted and is underway.",
        requiredRoles: [
          "vendor",
          "admin",
          "artwork-designer",
          "delivery-person",
        ],
        actions: [
          {
            eventId: "JOB_COMPLETED",
            label: "Complete Job",
            icon: "🎉",
            variant: "greenSuccess",
          },
          {
            eventId: "JOB_CANCELLED",
            label: "Cancel Job",
            icon: "🚫",
            variant: "graySecondary",
            requiredRoles: ["admin"],
          },
        ],
        escalations: [],
      },
      {
        state: "REJECTED",
        label: "Rejected",
        progress: 0,
        description: "Job was rejected by the assignee.",
        requiredRoles: [
          "admin",
          "artwork-designer",
          "vendor",
          "delivery-person",
        ],
        actions: [],
        escalations: [],
      },
      {
        state: "EXPIRED",
        label: "Expired",
        progress: 0,
        description: "Job was not accepted within the required timeframe.",
        requiredRoles: ["system"],
        actions: [],
        escalations: [],
      },
      {
        state: "COMPLETED",
        label: "Completed",
        progress: 100,
        description: "Job has been successfully completed.",
        requiredRoles: [],
        actions: [],
        escalations: [],
      },
      {
        state: "CANCELLED",
        label: "Cancelled",
        progress: 0,
        description: "Job was cancelled.",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
    ],

    transitions: [
      // From AWAITING_ACCEPTANCE
      {
        fromState: "AWAITING_ACCEPTANCE",
        toState: "ACCEPTED",
        eventId: "JOB_ACCEPTED",
      },
      {
        fromState: "AWAITING_ACCEPTANCE",
        toState: "REJECTED",
        eventId: "JOB_REJECTED",
      },
      {
        fromState: "AWAITING_ACCEPTANCE",
        toState: "EXPIRED",
        eventId: "JOB_EXPIRED",
      },
      {
        fromState: "AWAITING_ACCEPTANCE",
        toState: "CANCELLED",
        eventId: "JOB_CANCELLED",
      },

      // From ACCEPTED
      { fromState: "ACCEPTED", toState: "COMPLETED", eventId: "JOB_COMPLETED" },
      { fromState: "ACCEPTED", toState: "CANCELLED", eventId: "JOB_CANCELLED" },
    ],

    escalations: [],
  },
});
