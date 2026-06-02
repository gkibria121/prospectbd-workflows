import { EscalationStrategy } from "../interfaces/escalation.interface";

export class StandardEscalationStrategy extends EscalationStrategy {
  constructor() {
    super();
    this.alerts = [
      {
        id: "std-order-sla-warning",
        name: "Standard Order SLA Warning",
        severity: "WARNING",
        channels: { email: true, sms: false, push: true, slack: false },
        roles: ["admin"],
        template:
          "Standard order has been in progress for {duration} {unit}. Please review.",
        deduplicate: true,
      },
    ];
    this.escalations = {
      root: {
        id: "std-order-sla-warning",
        actionType: "send-sla",
        after: { duration: 5, unit: "days" },
      },
    };
  }
}
