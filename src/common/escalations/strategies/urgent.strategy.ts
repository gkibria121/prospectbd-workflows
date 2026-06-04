import { EscalationStrategy } from "../interfaces/escalation.interface";
import { WORKFLOWS } from "./../../registry";
import { ALERTS } from "./const.strategy";

const getEscalation = (id: typeof ALERTS[number]["id"], trigger: any) => {
  const alertRule = ALERTS.find((a) => a.id === id);
  if (!alertRule) throw new Error(`Alert rule ${id} not found`);
  return { ...trigger, id, alertRule };
};

export class UrgentEscalationStrategy extends EscalationStrategy<
  | typeof WORKFLOWS.order
  | (typeof WORKFLOWS)["order-item"]
  | (typeof WORKFLOWS)["order-job"]
  | (typeof WORKFLOWS)["delivery"]
> {
  constructor() {
    super();
    this.escalationMap = [
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: getEscalation("inquiry-unclaimed", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: getEscalation("quote-not-generated", {
          actionType: "send-sla",
          after: { duration: 2, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "AWAITING_PAYMENT",
        escalation: getEscalation("quote-not-viewed", {
          actionType: "send-sla",
          after: { duration: 3, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "PENDING_REVIEW",
        escalation: getEscalation("artwork-pending-review", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "REVIEWED",
        escalation: getEscalation("production-not-assigned", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "IN_PRODUCTION",
        escalation: getEscalation("ready-for-collection-delay-risk", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order"]["definitionName"],
        state: "READY_FOR_COLLECTION",
        escalation: getEscalation("courier-not-assigned", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["order-job"]["definitionName"],
        state: "AWAITING_ACCEPTANCE",
        escalation: getEscalation("courier-confirmation-pending", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        state: "COLLECTED_FROM_PRODUCTION",
        escalation: getEscalation("courier-not-dispatched", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: getEscalation("delivery-eta-risk", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
      {
        state: "root",
        definitionName: WORKFLOWS["delivery"]["definitionName"],
        escalation: getEscalation("delivery-overdue", {
          actionType: "send-sla",
          after: { duration: 1, unit: "minutes" },
        }),
      },
    ];
  }
}

