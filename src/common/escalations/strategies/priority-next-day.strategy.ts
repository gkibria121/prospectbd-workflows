import { EscalationStrategy } from "../interfaces/escalation.interface";

export class PriorityNextDayEscalationStrategy extends EscalationStrategy {
  constructor() {
    super();
    this.alerts = [
      {
        id: "priority-order-sla-critical",
        name: "Priority Next Day Order SLA Critical",
        severity: "CRITICAL",
        channels: { email: true, sms: true, push: true, slack: true },
        roles: ["admin"],
        template: "URGENT CRITICAL: Priority Next Day order is breaching SLA after {duration} {unit}!",
        deduplicate: true,
      }
    ];
    this.escalations = {
      root: {
        id: "priority-order-sla-critical",
        actionType: "send-sla",
        after: { duration: 24, unit: "hours" }
      }
    };
  }
}
