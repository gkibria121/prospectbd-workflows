import { EscalationStrategy } from "../interfaces/escalation.interface";

export class UrgentEscalationStrategy extends EscalationStrategy {
  constructor() {
    super();
    this.alerts = [
      {
        id: "urgent-order-sla-critical",
        name: "Urgent Order SLA Critical",
        severity: "CRITICAL",
        channels: { email: true, sms: true, push: true, slack: true },
        roles: ["admin"],
        template: "CRITICAL: Urgent order is breaching SLA after {duration} {unit}!",
        deduplicate: true,
      }
    ];
    this.escalations = {
      root: {
        id: "urgent-order-sla-critical",
        actionType: "send-sla",
        after: { duration: 48, unit: "hours" }
      }
    };
  }
}
