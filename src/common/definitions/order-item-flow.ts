import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

export const ORDER_ITEM_FLOW_CONFIG = defineWorkflow({
  definitionName: "order-item-lifecycle",
  resourceType: "order-item",

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
    },
    {
      icon: "👀",
      name: "Start Review",
      eventId: "REVIEW_STARTED",
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
  ],
  alerts: [],
  stateMachine: {
    states: [
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
        ],
        description: "Admin is currently reviewing the order.",
        requiredRoles: ["admin"],
        escalations: [],
      },
      {
        label: "In Production",
        state: "IN_PRODUCTION",
        progress: 50,
        actions: [
          {
            icon: "📋",
            label: "Finish Production",
            eventId: "READY_FOR_COLLECTION",
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
        progress: 70,
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
        progress: 90,
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
        progress: 80,
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
    ],
    initialState: "PENDING_REVIEW",
    finalStates: ["DELIVERED"],
    transitions: [
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
    ],
    escalations: [],
  },
});
