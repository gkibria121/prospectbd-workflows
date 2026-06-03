import { describe, it, expect } from "bun:test";
import { EscalationStrategy } from "./escalation.interface";
import { ALERTS } from "../strategies/const.strategy";
import {
  ORDER_FLOW_CONFIG,
  ORDER_ITEM_FLOW_CONFIG,
  WORKFLOWS,
} from "src/common/registry";

const MOCK_ALERTS = ALERTS;

class TestStrategy extends EscalationStrategy<
  | typeof WORKFLOWS.order
  | (typeof WORKFLOWS)["order-item"]
  | (typeof WORKFLOWS)["order-job"]
  | (typeof WORKFLOWS)["delivery"],
  typeof ALERTS
> {
  constructor() {
    super();
    this.alerts = MOCK_ALERTS;
    this.escalationMap = [
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "inquiry-unclaimed",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "quote-not-generated",
          actionType: "send-sla",
          after: { duration: 2, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "quote-not-viewed",
          actionType: "send-sla",
          after: { duration: 3, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "PENDING_REVIEW",
        escalation: {
          id: "artwork-pending-review",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "REVIEWED",
        escalation: {
          id: "production-not-assigned",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "IN_PRODUCTION",
        escalation: {
          id: "ready-for-collection-delay-risk",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "READY_FOR_COLLECTION",
        escalation: {
          id: "courier-not-assigned",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order-job"]["definitionName"],
        state: "AWAITING_ACCEPTANCE",
        escalation: {
          id: "courier-confirmation-pending",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        state: "COLLECTED_FROM_PRODUCTION",
        escalation: {
          id: "courier-not-dispatched",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: {
          id: "delivery-eta-risk",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: {
          id: "delivery-overdue",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        },
      },
    ];
  }
}
describe("EscalationStrategy", () => {
  it("should inject escalations correctly for a matching definitionName", () => {
    const strategy = new TestStrategy();
    const config = {
      ...ORDER_FLOW_CONFIG,
      workflowId: "test-workflow",
    };

    const updated = strategy.injectEscalations(config);

    // root-level escalations (none for 'order')
    expect(updated.stateMachine.escalations).toHaveLength(0);

    const expectedInjectedCounts: Record<string, number> = {
      AWAITING_PAYMENT: 3,
      PENDING_REVIEW: 1,
      REVIEWED: 1,
      IN_PRODUCTION: 1,
      READY_FOR_COLLECTION: 1,
    };

    for (const state of updated.stateMachine.states) {
      const originalState = config.stateMachine.states.find(
        (s: any) => s.state === state.state,
      );
      const originalLength = originalState?.escalations?.length || 0;
      const expectedInjected = expectedInjectedCounts[state.state] || 0;
      const expectedTotal = originalLength + expectedInjected;

      expect(state.escalations || []).toHaveLength(expectedTotal);
    }
  });
});
