import { z } from "zod";
import { defineWorkflow } from "../workflow-utils";

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
    {
      eventId: "PRODUCTION_COMPLETED",
      name: "Complete Production",
      icon: "✅",
    },
  ],
  alerts: [],

  stateMachine: {
    initialState: "PENDING",
    finalStates: ["COMPLETED"],

    states: [
      {
        state: "PENDING",
        progress: 50,
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
        progress: 80,
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
        progress: 90,
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
        progress: 100,
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
