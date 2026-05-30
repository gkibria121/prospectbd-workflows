import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

export const DELIVERY_FLOW_CONFIG = defineWorkflow({
  definitionName: "delivery-lifecycle",
  resourceType: "delivery-run",

  events: [
    { eventId: "DRAFT_CREATED", name: "Create Job", icon: "📝" },
    { eventId: "COLLECTED", name: "Collect from Production", icon: "📤" },
    { eventId: "SHIPPED", name: "Start Delivery", icon: "🚚" },
    { eventId: "DELIVERED", name: "Mark Delivered", icon: "🎉" },
  ],
  alerts: [
    {
      name: "Critical Delivery Delay Tracker",
      id: "delivery-overdue",
      severity: "CRITICAL",
      channels: { email: true, sms: true, push: true, slack: false },
      roles: ["admin", "delivery-person"],
      template:
        "CRITICAL: Order {orderId} is overdue for delivery. Assigned driver: {driverName}. Expected arrival was {expectedTime}.",
      deduplicate: true,
    },
  ],
  stateMachine: {
    initialState: "PENDING",
    finalStates: ["DELIVERED"],

    states: [
      {
        state: "PENDING",
        progress: 10,
        label: "Pending",
        description: "Delivery job created, awaiting collection.",
        requiredRoles: ["admin", "delivery-person"],
        actions: [
          {
            eventId: "COLLECTED",
            label: "Collect",
            icon: "📤",
            variant: "bluePrimary",
          },
        ],
        escalations: [],
      },
      {
        state: "COLLECTED_FROM_PRODUCTION",
        label: "Collected",
        progress: 40,
        description: "Package collected from production.",
        requiredRoles: ["delivery-person", "admin"],
        actions: [
          {
            eventId: "SHIPPED",
            label: "Start Delivery",
            icon: "🚚",
            variant: "orangePrimary",
          },
        ],
        escalations: [],
      },
      {
        state: "IN_TRANSIT",
        label: "In Transit",
        progress: 70,
        description: "Package is on the way.",
        requiredRoles: ["delivery-person", "admin"],
        actions: [
          {
            eventId: "DELIVERED",
            label: "Mark Delivered",
            icon: "🎉",
            variant: "greenSuccess",
          },
        ],
        escalations: [],
      },
      {
        state: "DELIVERED",
        progress: 100,
        label: "Delivered",
        description: "Package successfully delivered.",
        requiredRoles: [],
        actions: [],
        escalations: [],
      },
    ],

    transitions: [

      {
        fromState: "PENDING",
        toState: "COLLECTED_FROM_PRODUCTION",
        eventId: "COLLECTED",
      },
      {
        fromState: "COLLECTED_FROM_PRODUCTION",
        toState: "IN_TRANSIT",
        eventId: "SHIPPED",
      },
      {
        fromState: "IN_TRANSIT",
        toState: "DELIVERED",
        eventId: "DELIVERED",
      },
    ],

    escalations: [],
  },
});
