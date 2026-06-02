import { WorkflowConfig } from "src/types";
import { EscalationStrategy } from "../interfaces/escalation.interface";
import { WORKFLOWS } from "src/common/registry";
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
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "inquiry-unclaimed",
          actionType: "send-sla",
          after: { duration: 3, unit: "minutes" },
        },
      },
      {
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "quote-not-generated",
          actionType: "send-sla",
          after: { duration: 10, unit: "minutes" },
        },
      },
      {
        state: "AWAITING_PAYMENT",
        escalation: {
          id: "quote-not-viewed",
          actionType: "send-sla",
          after: { duration: 5, unit: "minutes" },
        },
      },
      {
        state: "PENDING_REVIEW",
        escalation: {
          id: "artwork-pending-review",
          actionType: "send-sla",
          after: { duration: 5, unit: "minutes" },
        },
      },
      {
        state: "REVIEWED",
        escalation: {
          id: "production-not-assigned",
          actionType: "send-sla",
          after: { duration: 5, unit: "minutes" },
        },
      },
      {
        state: "IN_PRODUCTION",
        escalation: {
          id: "ready-for-collection-delay-risk",
          actionType: "send-sla",
          after: { duration: 30, unit: "minutes" },
        },
      },
      {
        state: "READY_FOR_COLLECTION",
        escalation: {
          id: "courier-not-assigned",
          actionType: "send-sla",
          after: { duration: 5, unit: "minutes" },
        },
      },
      {
        state: "AWAITING_ACCEPTANCE",
        escalation: {
          id: "courier-confirmation-pending",
          actionType: "send-sla",
          after: { duration: 3, unit: "minutes" },
        },
      },
      {
        state: "COLLECTED_FROM_PRODUCTION",
        escalation: {
          id: "courier-not-dispatched",
          actionType: "send-sla",
          after: { duration: 5, unit: "minutes" },
        },
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: {
          id: "delivery-eta-risk",
          actionType: "send-sla",
          after: { duration: 40, unit: "minutes" },
        },
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: {
          id: "delivery-overdue",
          actionType: "send-sla",
          after: { duration: 50, unit: "minutes" },
        },
      },
    ];
  }
}
