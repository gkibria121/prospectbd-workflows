import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

export const QUOTE_FLOW_CONFIG = defineWorkflow({
  definitionName: "quote-lifecycle",
  resourceType: "quote",
  events: [
    { eventId: "DRAFT_CREATED", name: "Create Quote", icon: "📝" },
    {
      eventId: "SENT_TO_CUSTOMER",
      name: "Send Quote",
      icon: "📤",
      schema: z.object({
        quoteId: z.string(),
        quoteNo: z.string(),
        timestamp: z.string(),
        type: z.literal("quote-notification"),
      }),
    },
    { eventId: "EDITED", name: "Edit Quote", icon: "✏️" },
    {
      eventId: "CUSTOMER_APPROVED",
      name: "Approve",
      icon: "✅",
      schema: z.object({
        quoteId: z.string(),
        quoteNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      eventId: "CUSTOMER_REJECTED",
      name: "Reject",
      icon: "❌",
      schema: z.object({
        quoteId: z.string(),
        quoteNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      eventId: "EXPIRED",
      name: "Expire",
      icon: "⏳",
      schema: z.object({
        resourceType: z.literal("quote"),
        id: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      eventId: "CONVERTED_TO_ORDER",
      name: "Convert to Order",
      icon: "📦",
      schema: z.object({
        quoteId: z.string(),
        quoteNo: z.string(),
        timestamp: z.string(),
      }),
    },
  ],
  alerts: [],
  stateMachine: {
    initialState: "DRAFT",
    finalStates: ["REJECTED", "EXPIRED", "CONVERTED"],
    states: [
      {
        state: "DRAFT",
        label: "Draft",
        progress: 0, // step 0/3
        description: "Quote is being prepared",
        requiredRoles: ["admin"],
        actions: [
          {
            eventId: "SENT_TO_CUSTOMER",
            label: "Send Quote",
            icon: "📤",
            variant: "bluePrimary",
          },
          {
            eventId: "CUSTOMER_APPROVED",
            label: "Approve",
            icon: "✅",
            variant: "greenSuccess",
          },
          {
            eventId: "EDITED",
            label: "Edit",
            icon: "✏️",
            variant: "graySecondary",
          },
        ],
        escalations: [],
      },
      {
        state: "SENT",
        label: "Sent",
        progress: 33.3, // step 1/3
        description: "Quote sent to customer",
        requiredRoles: ["admin", "customer"],
        actions: [
          {
            eventId: "CUSTOMER_APPROVED",
            label: "Approve",
            icon: "✅",
            variant: "greenSuccess",
          },
          {
            eventId: "CUSTOMER_REJECTED",
            label: "Reject",
            icon: "❌",
            variant: "redDanger",
          },
          {
            eventId: "EXPIRED",
            label: "Expire",
            icon: "⏳",
            variant: "grayOutline",
          },
        ],
        escalations: [
          {
            id: "quote-expiry-warning",
            after: {
              duration: 2,
              unit: "minutes",
            },
            actionType: "send-sla",
          },
        ],
      },
      {
        state: "ACCEPTED",
        label: "Accepted",
        progress: 66.7, // step 2/3
        description: "Quote approved by customer",
        requiredRoles: ["admin"],
        actions: [
          {
            eventId: "CONVERTED_TO_ORDER",
            label: "Convert to Order",
            icon: "📦",
            variant: "bluePrimary",
          },
        ],
        escalations: [],
      },
      {
        state: "REJECTED",
        label: "Rejected",
        progress: 0, // off happy-path terminal
        description: "Quote rejected by customer",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
      {
        state: "EXPIRED",
        label: "Expired",
        progress: 0, // off happy-path terminal
        description: "Quote validity expired",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
      {
        state: "CONVERTED",
        label: "Converted",
        progress: 100, // step 3/3
        description: "Quote converted to order",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
    ],
    transitions: [
      { fromState: "", toState: "DRAFT", eventId: "DRAFT_CREATED" },
      { fromState: "DRAFT", toState: "DRAFT", eventId: "EDITED" },
      { fromState: "DRAFT", toState: "ACCEPTED", eventId: "CUSTOMER_APPROVED" },
      { fromState: "DRAFT", toState: "SENT", eventId: "SENT_TO_CUSTOMER" },
      { fromState: "DRAFT", toState: "EXPIRED", eventId: "EXPIRED" },
      { fromState: "SENT", toState: "ACCEPTED", eventId: "CUSTOMER_APPROVED" },
      { fromState: "SENT", toState: "REJECTED", eventId: "CUSTOMER_REJECTED" },
      { fromState: "SENT", toState: "EXPIRED", eventId: "EXPIRED" },
      {
        fromState: "ACCEPTED",
        toState: "CONVERTED",
        eventId: "CONVERTED_TO_ORDER",
      },
      { fromState: "ACCEPTED", toState: "EXPIRED", eventId: "EXPIRED" },
    ],
    escalations: [
      {
        id: "quote-expiry",
        label: "Quote Expiration",
        after: { duration: 30, unit: "days" }, // Default placeholder, overridden in QuoteService
        actionType: "raise-event",
            eventId: "EXPIRED",
      },
    ],
  },
});
