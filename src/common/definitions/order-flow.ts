import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

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
      name: "Cancel Refund (In Review)",
      eventId: "REFUND_CANCELED_IN_IN_REVIEW",
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
      icon: "👀",
      name: "Start Review",
      eventId: "REVIEW_STARTED",
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
  alerts: [],
  stateMachine: {
    states: [
      {
        label: "Awaiting Payment",
        state: "AWAITING_PAYMENT",
        progress: 10,
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
        progress: 20,
        actions: [
          {
            icon: "👀",
            label: "Start Review",
            eventId: "REVIEW_STARTED",
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
        label: "In Review",
        state: "IN_REVIEW",
        progress: 25,
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
        description: "Admin is currently reviewing the order.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "In Production",
        state: "IN_PRODUCTION",
        progress: 40,
        actions: [
          {
            icon: "📋",
            label: "Finish Production",
            eventId: "READY_FOR_COLLECTION",
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
        progress: 50,
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
        progress: 60,
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
        progress: 70,
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
        progress: 100,
        actions: [],
        description: "Order successfully delivered.",
        requiredRoles: [],
        escalations: [],
      },

      {
        label: "Refund in Progress",
        state: "REFUND_IN_PROGRESS",
        progress: 0, // off happy-path
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
            label: "Cancel Refund → In Review",
            eventId: "REFUND_CANCELED_IN_IN_REVIEW",
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
        progress: 0, // off happy-path terminal
        actions: [],
        description: "Order has been refunded.",
        requiredRoles: ["admin"],
        escalations: [],
      },
    ],
    initialState: "AWAITING_PAYMENT",
    finalStates: ["REFUNDED", "DELIVERED"],
    transitions: [
      {
        fromState: "AWAITING_PAYMENT",
        eventId: "PAID_CONFIRMED",
        toState: "PENDING_REVIEW",
      },
      {
        fromState: "PENDING_REVIEW",
        eventId: "REVIEW_STARTED",
        toState: "IN_REVIEW",
      },
      {
        fromState: "IN_REVIEW",
        eventId: "PRODUCTION_STARTED",
        toState: "IN_PRODUCTION",
      },
      {
        fromState: "IN_PRODUCTION",
        eventId: "READY_FOR_COLLECTION",
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
        fromState: "IN_REVIEW",
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
        eventId: "REFUND_CANCELED_IN_IN_REVIEW",
        toState: "IN_REVIEW",
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
