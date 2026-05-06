import { z } from "zod";
import { defineWorkflow, defineWorkflowSystem } from "./workflow-utils";

export const ORDER_FLOW_CONFIG = defineWorkflow({
  definitionName: "standard-order-flow",
  resourceType: "order",
  events: [
    {
      icon: "📦",
      name: "Create Order",
      eventId: "CREATED",
    },
    {
      icon: "💳",
      name: "Pay & Confirm",
      eventId: "PAID_CONFIRMED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "↩️",
      name: "Cancel Refund (In Pending Review)",
      eventId: "REFUND_CANCELED_IN_PENDING_REVIEW",
      schema: z.object({
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "↩️",
      name: "Cancel Refund (In Reviewed)",
      eventId: "REFUND_CANCELED_IN_REVIEWED",
      schema: z.object({
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "↩️",
      name: "Cancel Refund (In Production)",
      eventId: "REFUND_CANCELED_IN_PRODUCTION",
      schema: z.object({
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "✅",
      name: "Review Order",
      eventId: "ADMIN_REVIEWED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "⚙️",
      name: "Start Production",
      eventId: "PRODUCTION_STARTED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "📋",
      name: "Finish Production",
      eventId: "PRODUCTION_COMPLETED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "📤",
      name: "Collect Order",
      eventId: "READY_FOR_COLLECTION",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "🚚",
      name: "Start Delivery",
      eventId: "SHIPPED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "🎉",
      name: "Mark Delivered",
      eventId: "DELIVERED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "🔄",
      name: "Initiate Refund",
      eventId: "REFUND_INITIATED",
      schema: z.object({
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "💸",
      name: "Mark Refunded",
      eventId: "REFUND_COMPLETED",
      schema: z.object({
        orderId: z.string(),
        timestamp: z.string(),
      }),
    },
  ],
  stateMachine: {
    states: [
      {
        label: "Unpaid",
        state: "UNPAID",
        actions: [
          {
            icon: "💳",
            label: "Pay & Confirm",
            eventId: "PAID_CONFIRMED",
            variant: "bluePrimary",
          },
        ],
        description: "Order created but not paid yet.",
        requiredRoles: ["customer", "admin"],
        escalations: [],
      },
      {
        label: "Pending Review",
        state: "PENDING_REVIEW",
        actions: [
          {
            icon: "✅",
            label: "Review Order",
            eventId: "ADMIN_REVIEWED",
            variant: "blueSecondary",
          },
          {
            icon: "🔄",
            label: "Initiate Refund",
            eventId: "REFUND_INITIATED",
            variant: "redDanger",
          },
        ],
        description: "Payment received. Awaiting admin review.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "Reviewed",
        state: "REVIEWED",
        actions: [
          {
            icon: "⚙️",
            label: "Start Production",
            eventId: "PRODUCTION_STARTED",
            variant: "orangePrimary",
          },
          {
            icon: "🔄",
            label: "Initiate Refund",
            eventId: "REFUND_INITIATED",
            variant: "redDanger",
          },
        ],
        description: "Order approved and ready for production.",
        requiredRoles: ["admin", "vendor"],
        escalations: [],
      },
      {
        label: "In Production",
        state: "IN_PRODUCTION",
        actions: [
          {
            icon: "📋",
            label: "Finish Production",
            eventId: "PRODUCTION_COMPLETED",
            variant: "greenTonal",
          },
          {
            icon: "🔄",
            label: "Initiate Refund",
            eventId: "REFUND_INITIATED",
            variant: "redDanger",
          },
        ],
        description: "Order is being produced.",
        requiredRoles: ["vendor", "admin"],
        escalations: [],
      },
      {
        label: "Ready for Collection",
        state: "READY_FOR_COLLECTION",
        actions: [
          {
            icon: "📤",
            label: "Collect Order",
            eventId: "READY_FOR_COLLECTION",
            variant: "bluePrimary",
          },
          {
            icon: "🚚",
            label: "Start Delivery",
            eventId: "SHIPPED",
            variant: "slateDark",
          },
        ],
        description: "Production done. Waiting for pickup or dispatch.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "Collected",
        state: "COLLECTED",
        actions: [
          {
            icon: "🚚",
            label: "Start Delivery",
            eventId: "SHIPPED",
            variant: "slateDark",
          },
        ],
        description: "Order picked up by delivery agent.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "In Transit",
        state: "IN_TRANSIT",
        actions: [
          {
            icon: "🎉",
            label: "Mark Delivered",
            eventId: "DELIVERED",
            variant: "greenSuccess",
          },
        ],
        description: "Order is on the way.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "Delivered",
        state: "DELIVERED",
        actions: [],
        description: "Order successfully delivered.",
        requiredRoles: [],
        escalations: [],
      },

      {
        label: "Refund in Progress",
        state: "REFUND_IN_PROGRESS",
        actions: [
          {
            icon: "💸",
            label: "Mark Refunded",
            eventId: "REFUND_COMPLETED",
            variant: "greenSuccess",
          },
          {
            icon: "🔄",
            label: "Initiate Refund",
            eventId: "REFUND_INITIATED",
            variant: "redDanger",
          },
          {
            icon: "↩️",
            label: "Cancel Refund → Pending Review",
            eventId: "REFUND_CANCELED_IN_PENDING_REVIEW",
            variant: "graySecondary",
          },
          {
            icon: "↩️",
            label: "Cancel Refund → Reviewed",
            eventId: "REFUND_CANCELED_IN_REVIEWED",
            variant: "graySecondary",
          },
          {
            icon: "↩️",
            label: "Cancel Refund → In Production",
            eventId: "REFUND_CANCELED_IN_PRODUCTION",
            variant: "graySecondary",
          },
        ],
        description: "Order is undergoing refund.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "Refunded",
        state: "REFUNDED",
        actions: [],
        description: "Order has been refunded.",
        requiredRoles: ["admin"],
        escalations: [],
      },
    ],
    initialState: "UNPAID",
    finalStates: ["REFUNDED", "DELIVERED"],
    transitions: [
      {
        fromState: "",
        eventId: "CREATED",
        toState: "UNPAID",
      },
      {
        fromState: "UNPAID",
        eventId: "PAID_CONFIRMED",
        toState: "PENDING_REVIEW",
      },
      {
        fromState: "PENDING_REVIEW",
        eventId: "ADMIN_REVIEWED",
        toState: "REVIEWED",
      },
      {
        fromState: "REVIEWED",
        eventId: "PRODUCTION_STARTED",
        toState: "IN_PRODUCTION",
      },
      {
        fromState: "IN_PRODUCTION",
        eventId: "PRODUCTION_COMPLETED",
        toState: "READY_FOR_COLLECTION",
      },
      {
        fromState: "READY_FOR_COLLECTION",
        eventId: "READY_FOR_COLLECTION",
        toState: "COLLECTED",
      },
      {
        fromState: "READY_FOR_COLLECTION",
        eventId: "SHIPPED",
        toState: "IN_TRANSIT",
      },
      {
        fromState: "COLLECTED",
        eventId: "SHIPPED",
        toState: "IN_TRANSIT",
      },
      {
        fromState: "IN_TRANSIT",
        eventId: "DELIVERED",
        toState: "DELIVERED",
      },
      {
        fromState: "PENDING_REVIEW",
        eventId: "REFUND_INITIATED",
        toState: "REFUND_IN_PROGRESS",
      },
      {
        fromState: "REVIEWED",
        eventId: "REFUND_INITIATED",
        toState: "REFUND_IN_PROGRESS",
      },
      {
        fromState: "IN_PRODUCTION",
        eventId: "REFUND_INITIATED",
        toState: "REFUND_IN_PROGRESS",
      },
      {
        fromState: "REFUND_IN_PROGRESS",
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
        eventId: "REFUND_CANCELED_IN_PENDING_REVIEW",
        toState: "PENDING_REVIEW",
      },
      {
        fromState: "REFUND_IN_PROGRESS",
        eventId: "REFUND_CANCELED_IN_REVIEWED",
        toState: "REVIEWED",
      },
      {
        fromState: "REFUND_IN_PROGRESS",
        eventId: "REFUND_CANCELED_IN_PRODUCTION",
        toState: "IN_PRODUCTION",
      },
    ],
    escalations: [],
  },
});

export const ORDER_ITEM_FLOW_CONFIG = defineWorkflow({
  definitionName: "order-item-lifecycle",
  resourceType: "order-item",

  events: [
    {
      icon: "💳",
      name: "Pay & Confirm",
      eventId: "PAID_CONFIRMED",
    },
    {
      icon: "✅",
      name: "Review Order",
      eventId: "ADMIN_REVIEWED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "⚙️",
      name: "Start Production",
      eventId: "PRODUCTION_STARTED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "📋",
      name: "Finish Production",
      eventId: "PRODUCTION_COMPLETED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "📤",
      name: "Collect Order",
      eventId: "READY_FOR_COLLECTION",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "🚚",
      name: "Start Delivery",
      eventId: "SHIPPED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
    {
      icon: "🎉",
      name: "Mark Delivered",
      eventId: "DELIVERED",
      schema: z.object({
        orderId: z.string(),
        orderNo: z.string(),
        timestamp: z.string(),
      }),
    },
  ],
  stateMachine: {
    states: [
      {
        label: "Pending Review",
        state: "PENDING_REVIEW",
        actions: [
          {
            icon: "✅",
            label: "Review Order",
            eventId: "ADMIN_REVIEWED",
            variant: "blueSecondary",
          },
        ],
        description: "Payment received. Awaiting admin review.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "Reviewed",
        state: "REVIEWED",
        actions: [
          {
            icon: "⚙️",
            label: "Start Production",
            eventId: "PRODUCTION_STARTED",
            variant: "orangePrimary",
          },
        ],
        description: "Order approved and ready for production.",
        requiredRoles: ["admin", "vendor"],
        escalations: [],
      },
      {
        label: "In Production",
        state: "IN_PRODUCTION",
        actions: [
          {
            icon: "📋",
            label: "Finish Production",
            eventId: "PRODUCTION_COMPLETED",
            variant: "greenTonal",
          },
        ],
        description: "Order is being produced.",
        requiredRoles: ["vendor", "admin"],
        escalations: [],
      },
      {
        label: "Ready for Collection",
        state: "READY_FOR_COLLECTION",
        actions: [
          {
            icon: "📤",
            label: "Collect Order",
            eventId: "READY_FOR_COLLECTION",
            variant: "bluePrimary",
          },
          {
            icon: "🚚",
            label: "Start Delivery",
            eventId: "SHIPPED",
            variant: "slateDark",
          },
        ],
        description: "Production done. Waiting for pickup or dispatch.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "Collected",
        state: "COLLECTED",
        actions: [
          {
            icon: "🚚",
            label: "Start Delivery",
            eventId: "SHIPPED",
            variant: "slateDark",
          },
        ],
        description: "Order picked up by delivery agent.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "In Transit",
        state: "IN_TRANSIT",
        actions: [
          {
            icon: "🎉",
            label: "Mark Delivered",
            eventId: "DELIVERED",
            variant: "greenSuccess",
          },
        ],
        description: "Order is on the way.",
        requiredRoles: ["delivery-person", "admin"],
        escalations: [],
      },
      {
        label: "Delivered",
        state: "DELIVERED",
        actions: [],
        description: "Order successfully delivered.",
        requiredRoles: [],
        escalations: [],
      },
    ],
    initialState: "PENDING_REVIEW",
    finalStates: ["DELIVERED"],
    transitions: [
      {
        fromState: "",
        eventId: "PAID_CONFIRMED",
        toState: "PENDING_REVIEW",
      },
      {
        fromState: "PENDING_REVIEW",
        eventId: "ADMIN_REVIEWED",
        toState: "REVIEWED",
      },
      {
        fromState: "REVIEWED",
        eventId: "PRODUCTION_STARTED",
        toState: "IN_PRODUCTION",
      },
      {
        fromState: "IN_PRODUCTION",
        eventId: "PRODUCTION_COMPLETED",
        toState: "READY_FOR_COLLECTION",
      },
      {
        fromState: "READY_FOR_COLLECTION",
        eventId: "READY_FOR_COLLECTION",
        toState: "COLLECTED",
      },
      {
        fromState: "READY_FOR_COLLECTION",
        eventId: "SHIPPED",
        toState: "IN_TRANSIT",
      },
      {
        fromState: "COLLECTED",
        eventId: "SHIPPED",
        toState: "IN_TRANSIT",
      },
      {
        fromState: "IN_TRANSIT",
        eventId: "DELIVERED",
        toState: "DELIVERED",
      },
    ],
    escalations: [],
  },
});

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
  stateMachine: {
    initialState: "DRAFT",
    finalStates: ["REJECTED", "EXPIRED", "CONVERTED"],
    states: [
      {
        state: "DRAFT",
        label: "Draft",
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
            label: "Quote Expiry Warning",
            after: {
              duration: 2,
              unit: "minutes",
            },
            action: {
              type: "send-sla",
              notifyRoles: ["admin"],
              severity: "warning",
            },
          },
        ],
      },
      {
        state: "ACCEPTED",
        label: "Accepted",
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
        description: "Quote rejected by customer",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
      {
        state: "EXPIRED",
        label: "Expired",
        description: "Quote validity expired",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
      {
        state: "CONVERTED",
        label: "Converted",
        description: "Quote converted to order",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
    ],
    transitions: [
      { fromState: "", toState: "DRAFT", eventId: "DRAFT_CREATED" },
      { fromState: "DRAFT", toState: "DRAFT", eventId: "EDITED" },
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
        action: { type: "raise-event", eventId: "EXPIRED" },
      },
    ],
  },
});

export const ARTWORK_FLOW_CONFIG = defineWorkflow({
  definitionName: "artwork-lifecycle",
  resourceType: "artwork-run",

  events: [
    { eventId: "DRAFT_CREATED", name: "Create Run", icon: "📝" },
    { eventId: "ARTWORK_UPLOADED", name: "Upload Artwork", icon: "📤" },
    { eventId: "REVISION_REQUESTED", name: "Request Revision", icon: "✏️" },
    { eventId: "ARTWORK_APPROVED", name: "Approve Artwork", icon: "✅" },
  ],

  stateMachine: {
    initialState: "ARTWORK_PENDING",
    finalStates: ["ARTWORK_APPROVED"],

    states: [
      {
        state: "ARTWORK_PENDING",
        label: "Artwork Pending",
        description: "Waiting for designer to upload initial artwork.",
        requiredRoles: ["artwork-designer", "admin"],
        actions: [
          {
            eventId: "ARTWORK_UPLOADED",
            label: "Upload Artwork",
            icon: "📤",
            variant: "bluePrimary",
            requiredRoles: ["artwork-designer", "admin"],
          },
          {
            eventId: "ARTWORK_APPROVED",
            label: "Fast-track Approval",
            icon: "✅",
            variant: "greenSuccess",
            requiredRoles: ["artwork-designer", "admin"],
          },
          {
            eventId: "REVISION_REQUESTED",
            label: "Pre-emptive Revision",
            icon: "✏️",
            variant: "graySecondary",
            requiredRoles: ["admin"],
          },
        ],
        escalations: [],
      },

      {
        state: "ARTWORK_IN_REVIEW",
        label: "In Review",
        description: "Admin is performing final review of the artwork.",
        requiredRoles: ["admin", "artwork-designer"],
        actions: [
          {
            eventId: "ARTWORK_APPROVED",
            label: "Approve Artwork",
            icon: "✅",
            variant: "greenSuccess",
          },
          {
            eventId: "REVISION_REQUESTED",
            label: "Request Revision",
            icon: "✏️",
            variant: "graySecondary",
            requiredRoles: ["admin"],
          },
        ],
        escalations: [],
      },

      {
        state: "ARTWORK_IN_REVISION",
        label: "In Revision",
        description: "Designer is updating artwork based on revision request.",
        requiredRoles: ["admin", "artwork-designer"],
        actions: [
          {
            eventId: "ARTWORK_APPROVED",
            label: "Approve",
            icon: "✅",
            variant: "greenSuccess",
          },
        ],
        escalations: [],
      },

      {
        state: "ARTWORK_APPROVED",
        label: "Artwork Approved",
        description: "Artwork has been fully approved.",
        requiredRoles: [],
        actions: [],
        escalations: [],
      },
    ],

    transitions: [
      // Initial creation
      { fromState: "", toState: "ARTWORK_PENDING", eventId: "DRAFT_CREATED" },

      // Normal path: Pending -> Review -> Approved
      {
        fromState: "ARTWORK_PENDING",
        toState: "ARTWORK_IN_REVIEW",
        eventId: "ARTWORK_UPLOADED",
      },
      {
        fromState: "ARTWORK_IN_REVIEW",
        toState: "ARTWORK_APPROVED",
        eventId: "ARTWORK_APPROVED",
      },

      // Revision loop
      {
        fromState: "ARTWORK_IN_REVIEW",
        toState: "ARTWORK_IN_REVISION",
        eventId: "REVISION_REQUESTED",
      },

      // Direct/Admin Paths (Satisfying reachability from initial state)
      {
        fromState: "ARTWORK_PENDING",
        toState: "ARTWORK_APPROVED",
        eventId: "ARTWORK_APPROVED",
      },
      {
        fromState: "ARTWORK_PENDING",
        toState: "ARTWORK_IN_REVISION",
        eventId: "REVISION_REQUESTED",
      },
      {
        fromState: "ARTWORK_IN_REVISION",
        toState: "ARTWORK_APPROVED",
        eventId: "ARTWORK_APPROVED",
      },
    ],

    escalations: [],
  },
});
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
  stateMachine: {
    states: [
      {
        label: "Refund in Progress",
        state: "REFUND_IN_PROGRESS",
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
        description: "Refund has been successfully completed.",
        requiredRoles: [],
        escalations: [],
      },
      {
        label: "Paid",
        state: "PAID",
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

/**
 * Single source of truth for all workflows in the system.
 * Add new workflows here to automatically update global registries, maps, and types.
 */
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

  stateMachine: {
    initialState: "AWAITING_ACCEPTANCE",
    finalStates: ["REJECTED", "EXPIRED", "COMPLETED", "CANCELLED"],

    states: [
      {
        state: "AWAITING_ACCEPTANCE",
        label: "Awaiting Acceptance",
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
            action: {
              type: "send-sla",
              notifyRoles: ["admin"],
              severity: "warning",
            },
          },
          {
            id: "job-expiry",
            label: "Job Auto-Expiration",
            after: { duration: 24, unit: "hours" },
            action: { type: "raise-event", eventId: "JOB_EXPIRED" },
          },
        ],
      },
      {
        state: "ACCEPTED",
        label: "Accepted",
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
        description: "Job was not accepted within the required timeframe.",
        requiredRoles: ["system"],
        actions: [],
        escalations: [],
      },
      {
        state: "COMPLETED",
        label: "Completed",
        description: "Job has been successfully completed.",
        requiredRoles: [],
        actions: [],
        escalations: [],
      },
      {
        state: "CANCELLED",
        label: "Cancelled",
        description: "Job was cancelled.",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
    ],

    transitions: [
      // Initial creation
      { fromState: "", toState: "AWAITING_ACCEPTANCE", eventId: "JOB_CREATED" },

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

export const PRODUCTION_FLOW_CONFIG = defineWorkflow({
  definitionName: "production-lifecycle",
  resourceType: "printing-job",

  events: [
    { eventId: "DRAFT_CREATED", name: "Create Job", icon: "📝" },
    { eventId: "PRODUCTION_STARTED", name: "Start Production", icon: "⚙️" },
    {
      eventId: "READY_FOR_COLLECTION",
      name: "Ready for Collection",
      icon: "📤",
    },
    { eventId: "PRODUCTION_COMPLETED", name: "Complete Production", icon: "✅" },
  ],

  stateMachine: {
    initialState: "PENDING",
    finalStates: ["COMPLETED"],

    states: [
      {
        state: "PENDING",
        label: "Pending",
        description: "Job created, awaiting production start.",
        requiredRoles: ["admin"],
        actions: [
          {
            eventId: "PRODUCTION_STARTED",
            label: "Start Production",
            icon: "⚙️",
            variant: "bluePrimary",
          },
        ],
        escalations: [],
      },
      {
        state: "IN_PRODUCTION",
        label: "In Production",
        description: "Job is currently in production.",
        requiredRoles: ["vendor", "admin"],
        actions: [
          {
            eventId: "READY_FOR_COLLECTION",
            label: "Mark Ready for Collection",
            icon: "📤",
            variant: "orangePrimary",
          },
        ],
        escalations: [],
      },
      {
        state: "READY_FOR_COLLECTION",
        label: "Ready for Collection",
        description: "Job finished and ready for pickup.",
        requiredRoles: ["vendor", "admin"],
        actions: [
          {
            eventId: "PRODUCTION_COMPLETED",
            label: "Finish Production",
            icon: "✅",
            variant: "greenSuccess",
          },
        ],
        escalations: [],
      },
      {
        state: "COMPLETED",
        label: "Completed",
        description: "Job has been fully completed.",
        requiredRoles: [],
        actions: [],
        escalations: [],
      },
    ],

    transitions: [
      { fromState: "", toState: "PENDING", eventId: "DRAFT_CREATED" },
      {
        fromState: "PENDING",
        toState: "IN_PRODUCTION",
        eventId: "PRODUCTION_STARTED",
      },
      {
        fromState: "IN_PRODUCTION",
        toState: "READY_FOR_COLLECTION",
        eventId: "READY_FOR_COLLECTION",
      },
      {
        fromState: "READY_FOR_COLLECTION",
        toState: "COMPLETED",
        eventId: "PRODUCTION_COMPLETED",
      },
    ],

    escalations: [],
  },
});

export const WORKFLOW_SYSTEM = defineWorkflowSystem({
  order: ORDER_FLOW_CONFIG,
  "order-item": ORDER_ITEM_FLOW_CONFIG,
  quote: QUOTE_FLOW_CONFIG,
  "order-job": JOB_FLOW_CONFIG,
  artwork: ARTWORK_FLOW_CONFIG,
  refund: REFUND_FLOW_CONFIG,
  production: PRODUCTION_FLOW_CONFIG,
});

export const { WORKFLOWS, WORKFLOW_REGISTRY } = WORKFLOW_SYSTEM;
