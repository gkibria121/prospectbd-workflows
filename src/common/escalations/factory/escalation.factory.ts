import { StandardEscalationStrategy } from "../strategies/standard.strategy";
import { UrgentEscalationStrategy } from "../strategies/urgent.strategy";
import { PriorityNextDayEscalationStrategy } from "../strategies/priority-next-day.strategy";

export class EscalationFactory {
  static getStrategy(
    urgencyLevel: "urgent" | "next-day" | "standard" = "standard",
  ) {
    const level = urgencyLevel;

    if (level === "next-day") {
      return new PriorityNextDayEscalationStrategy();
    }

    if (level == "urgent") {
      return new UrgentEscalationStrategy();
    }

    return new StandardEscalationStrategy();
  }
}
