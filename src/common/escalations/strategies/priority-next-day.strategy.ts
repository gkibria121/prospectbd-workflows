import { EscalationStrategy } from "../interfaces/escalation.interface";
import { WORKFLOWS } from "src/common/registry";
import { ALERTS } from "./const.strategy";

export class PriorityNextDayEscalationStrategy extends EscalationStrategy<
  typeof WORKFLOWS.order | (typeof WORKFLOWS)["order-item"]
> {
  constructor() {
    super();
    this.alerts = ALERTS;
    this.escalationMap = [];
  }
}
