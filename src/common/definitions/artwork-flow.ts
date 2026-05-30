import { defineWorkflow } from "../workflow-utils";

export const ARTWORK_FLOW_CONFIG = defineWorkflow({
  definitionName: "artwork-lifecycle",
  resourceType: "artwork-run",

  events: [
    { eventId: "DRAFT_CREATED", name: "Create Run", icon: "📝" },
    { eventId: "ARTWORK_UPLOADED", name: "Artwork Uploaded", icon: "📤" },
    { eventId: "REVISION_REQUESTED", name: "Request Revision", icon: "✏️" },
    { eventId: "ARTWORK_APPROVED", name: "Approve Artwork", icon: "✅" },
  ],
  alerts: [],

  stateMachine: {
    initialState: "ARTWORK_PENDING",
    finalStates: ["ARTWORK_APPROVED", "ARTWORK_REJECTED"],

    states: [
      {
        state: "ARTWORK_PENDING",
        progress: 50,
        label: "Artwork Pending",
        description: "Waiting for designer to upload initial artwork.",
        requiredRoles: ["artwork-designer", "admin"],
        actions: [
          {
            eventId: "ARTWORK_UPLOADED",
            label: "Artwork Uploaded",
            icon: "📤",
            variant: "bluePrimary",
          },
          {
            eventId: "ARTWORK_APPROVED",
            label: "Fast-track Approval",
            icon: "✅",
            variant: "greenSuccess",
          },
          {
            eventId: "REVISION_REQUESTED",
            label: "Pre-emptive Revision",
            icon: "✏️",
            variant: "graySecondary",
          },
        ],
        escalations: [],
      },

      {
        state: "ARTWORK_IN_REVIEW",
        label: "In Review",
        progress: 80,
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
        progress: 70,
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
        state: "ARTWORK_RECEIVED",
        label: "Received",
        progress: 60,
        description: "Artwork has been received and is awaiting review.",
        requiredRoles: ["artwork-designer", "admin"],
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
        state: "ARTWORK_REJECTED",
        label: "Rejected",
        progress: 0,
        description: "Artwork has been rejected.",
        requiredRoles: ["admin"],
        actions: [],
        escalations: [],
      },
      {
        state: "ARTWORK_APPROVED",
        progress: 100,
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

      // Normal path: Pending -> Received -> Review -> Approved
      {
        fromState: "ARTWORK_PENDING",
        toState: "ARTWORK_RECEIVED",
        eventId: "ARTWORK_UPLOADED",
      },
      {
        fromState: "ARTWORK_RECEIVED",
        toState: "ARTWORK_APPROVED",
        eventId: "ARTWORK_APPROVED",
      },
      {
        fromState: "ARTWORK_RECEIVED",
        toState: "ARTWORK_IN_REVISION",
        eventId: "REVISION_REQUESTED",
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
