import { EscalationStrategy } from "../interfaces/escalation.interface";
import { WORKFLOWS } from "./../../registry";
import { ALERTS } from "./const.strategy";

export class UrgentEscalationStrategy extends EscalationStrategy<
  | typeof WORKFLOWS.order
  | (typeof WORKFLOWS)["order-item"]
  | (typeof WORKFLOWS)["order-job"]
  | (typeof WORKFLOWS)["delivery"],
  typeof ALERTS
> {
  constructor() {
    super();
    this.alerts = ALERTS;
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
          after: { duration: 1, unit: "minutes" },
        },
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "quote-not-viewed",
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
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
