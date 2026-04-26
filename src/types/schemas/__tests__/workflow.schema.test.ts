import { WorkflowConfigBaseSchema } from "../workflow.schema";
import { describe, it, expect } from "bun:test";
describe("WorkflowConfigBaseSchema", () => {
  const validConfig = {
    events: [
      { eventId: "submit", name: "Submit", icon: "send" },
      { eventId: "approve", name: "Approve", icon: "check" },
      { eventId: "reject", name: "Reject", icon: "close" },
    ],
    stateMachine: {
      initialState: "draft",
      finalStates: ["approved", "rejected"],
      states: [
        {
          state: "draft",
          label: "Draft",
          description: "Initial state",
          requiredRoles: ["admin"],
          actions: [
            {
              eventId: "submit",
              label: "Submit",
              icon: "send",
              variant: "bluePrimary",
            },
          ],
        },
        {
          state: "review",
          label: "Review",
          description: "Under review",
          requiredRoles: ["admin"],
          actions: [
            {
              eventId: "approve",
              label: "Approve",
              icon: "check",
              variant: "greenSuccess",
            },
            {
              eventId: "reject",
              label: "Reject",
              icon: "close",
              variant: "redDanger",
            },
          ],
        },
        {
          state: "approved",
          label: "Approved",
          description: "Final approved state",
          requiredRoles: [],
          actions: [],
        },
        {
          state: "rejected",
          label: "Rejected",
          description: "Final rejected state",
          requiredRoles: [],
          actions: [],
        },
      ],
      transitions: [
        { fromState: "", toState: "draft", eventId: "submit" },
        { fromState: "draft", toState: "review", eventId: "submit" },
        { fromState: "review", toState: "approved", eventId: "approve" },
        { fromState: "review", toState: "rejected", eventId: "reject" },
      ],
    },
  };

  it("should validate a valid configuration", () => {
    const result = WorkflowConfigBaseSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  describe("Duplicate ID validations", () => {
    it("should fail if there are duplicate state IDs", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.states[1].state = "draft";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Duplicate state id: "draft"',
        );
      }
    });

    it("should fail if there are duplicate event IDs", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.events[1].eventId = "submit";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Duplicate event id: "submit"',
        );
      }
    });
  });

  describe("Initial and Final state validations", () => {
    it("should fail if initialState is not defined in states", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.initialState = "non-existent";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Initial state "non-existent" is not defined in states',
        );
      }
    });

    it("should fail if a finalState is not defined in states", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.finalStates.push("non-existent");
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Final state "non-existent" is not defined in states',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if initialState is also a final state", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.finalStates.push("draft");
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Final state "draft" must not have outgoing transitions',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if there are duplicate final states", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.finalStates.push("approved");
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes('Duplicate final state: "approved"'),
          ),
        ).toBe(true);
      }
    });
  });

  describe("Transition validations", () => {
    it("should fail if fromState in transition is not defined", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.transitions[0].fromState = "non-existent";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'fromState "non-existent" is not defined in states',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if toState in transition is not defined", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.transitions[0].toState = "non-existent";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'toState "non-existent" is not defined in states',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if eventId in transition is not defined", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.transitions[0].eventId = "non-existent";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Transition eventId "non-existent" is not defined in events',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if a final state has an outgoing transition", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.transitions.push({
        fromState: "approved",
        toState: "draft",
        eventId: "submit",
      });
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Final state "approved" must not have outgoing transitions',
            ),
          ),
        ).toBe(true);
      }
    });
  });

  describe("Action button validations", () => {
    it("should fail if a non-final state has no action buttons", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.states[0].actions = [];
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'State "draft" is not a final state and must have at least one action',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if an action button eventId is not defined in events", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.states[0].actions[0].eventId = "non-existent";
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Action button eventId "non-existent" is not defined in events',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if an action button has no matching transition", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      // Add an event but no transition for it
      config.events.push({ eventId: "cancel", name: "Cancel", icon: "cancel" });
      config.stateMachine.states[0].actions.push({
        eventId: "cancel",
        label: "Cancel",
        icon: "cancel",
        variant: "graySecondary",
      });
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Action button "cancel" on state "draft" has no matching transition',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if a transition has no corresponding action button and no escalation", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      // Remove action button but keep transition
      config.stateMachine.states[0].actions = [
        { eventId: "other", label: "Other", icon: "other", variant: "unstyled" },
      ];
      config.events.push({ eventId: "other", name: "Other", icon: "" });
      config.stateMachine.transitions.push({
        fromState: "draft",
        toState: "review",
        eventId: "other",
      });
      // Remove the valid action button for the submit transition
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Transition event "submit" from state "draft" has no corresponding action button on that state and is not triggered by an escalation',
            ),
          ),
        ).toBe(true);
      }
    });
  });

  describe("Transition Uniqueness", () => {
    it("should fail if a fromState has duplicate transitions for the same eventId", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.transitions.push({
        fromState: "draft",
        toState: "approved",
        eventId: "submit",
      });
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'State "draft" already has a transition for event "submit"',
            ),
          ),
        ).toBe(true);
      }
    });
  });

  describe("Escalation validations", () => {
    it("should fail if global escalation eventId is not defined in events", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.escalations = [
        {
          id: "esc1",
          label: "Escalate",
          after: { duration: 1, unit: "hours" },
          action: { type: "raise-event", eventId: "non-existent" },
        },
      ];
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Global escalation eventId "non-existent" is not defined in events',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if global escalation event has no transition from a non-final state", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.escalations = [
        {
          id: "esc1",
          label: "Escalate",
          after: { duration: 1, unit: "hours" },
          action: { type: "raise-event", eventId: "approve" },
        },
      ];
      // "draft" state does not have a transition for "approve"
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Global escalation event "approve" has no transition defined from state "draft"',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if state-specific escalation eventId is not defined in events", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.states[0].escalations = [
        {
          id: "esc1",
          label: "Escalate",
          after: { duration: 1, unit: "hours" },
          action: { type: "raise-event", eventId: "non-existent" },
        },
      ];
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Escalation eventId "non-existent" on state "draft" is not defined in events',
            ),
          ),
        ).toBe(true);
      }
    });

    it("should fail if state-specific escalation event has no transition from that state", () => {
      const config = JSON.parse(JSON.stringify(validConfig));
      config.stateMachine.states[0].escalations = [
        {
          id: "esc1",
          label: "Escalate",
          after: { duration: 1, unit: "hours" },
          action: { type: "raise-event", eventId: "approve" },
        },
      ];
      // "draft" state does not have a transition for "approve"
      const result = WorkflowConfigBaseSchema.safeParse(config);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              'Escalation event "approve" on state "draft" has no matching transition',
            ),
          ),
        ).toBe(true);
      }
    });
  });
});
