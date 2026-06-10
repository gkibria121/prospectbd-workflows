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
  alerts: [],
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
        escalations: [],
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
