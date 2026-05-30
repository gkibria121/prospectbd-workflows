import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

export const REFUND_FLOW_CONFIG = defineWorkflow({
  definitionName: "refund-lifecycle",
  resourceType: "invoice",
  events: [
    {
      icon: "🔄",
      name: "Initiate Refund",
      eventId: "REFUND_INITIATED",
      schema: z.object({
        invoiceId: z.string(),
        orderId: z.string(),
        amount: z.number(),
        reason: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "💸",
      name: "Mark Refunded",
      eventId: "REFUND_COMPLETED",
      schema: z.object({
        invoiceId: z.string(),
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "↩️",
      name: "Cancel Refund",
      eventId: "REFUND_CANCELED",
      schema: z.object({
        invoiceId: z.string(),
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
  ],
  alerts: [],
  stateMachine: {
    states: [
      {
        label: "Refund in Progress",
        state: "REFUND_IN_PROGRESS",
        progress: 50, // step 1/2 (only intermediate state)
        actions: [
          {
            icon: "💸",
            label: "Mark Refunded",
            eventId: "REFUND_COMPLETED",
            variant: "greenSuccess",
          },
          {
            icon: "↩️",
            label: "Cancel Refund",
            eventId: "REFUND_CANCELED",
            variant: "graySecondary",
          },
        ],
        description: "Refund has been initiated and is being processed.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "Refunded",
        state: "REFUNDED",
        actions: [],
        progress: 100, // terminal — refund completed
        description: "Refund has been successfully completed.",
        requiredRoles: [],
        escalations: [],
      },
      {
        label: "Paid",
        state: "PAID",
        progress: 100, // terminal — refund cancelled, fully resolved
        actions: [],
        description: "Refund was cancelled and invoice is back to paid status.",
        requiredRoles: [],
        escalations: [],
      },
    ],
    initialState: "REFUND_IN_PROGRESS",
    finalStates: ["REFUNDED", "PAID"],
    transitions: [
      {
        fromState: "",
        eventId: "REFUND_INITIATED",
        toState: "REFUND_IN_PROGRESS",
      },
      {
        fromState: "REFUND_IN_PROGRESS",
        eventId: "REFUND_COMPLETED",
        toState: "REFUNDED",
      },
      {
        fromState: "REFUND_IN_PROGRESS",
        eventId: "REFUND_CANCELED",
        toState: "PAID",
      },
    ],
    escalations: [],
  },
});
