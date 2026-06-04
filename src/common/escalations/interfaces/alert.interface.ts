import type {
  AlertConfig,
  WorkflowEscalation,
  EscalationAlertPayload,
} from "src/types";

export abstract class IAlert<TContext = any> {
  abstract readonly alert: AlertConfig;

  protected nextAlert: IAlert<TContext> | null = null;
  protected trigger?: Pick<WorkflowEscalation, "actionType" | "after">;

  public setNext(alert: IAlert<TContext>): IAlert<TContext> {
    this.nextAlert = alert;
    return alert;
  }

  getEscalation(
    trigger: Pick<WorkflowEscalation, "actionType" | "after">,
  ): WorkflowEscalation & { alertRule: AlertConfig } {
    this.trigger = trigger;
    return {
      ...this.trigger,
      id: this.alert.id,
      alertRule: this.alert,
    } as WorkflowEscalation & { alertRule: AlertConfig };
  }

  public async shouldProcess(
    context: TContext,
    payload: EscalationAlertPayload,
  ): Promise<boolean> {
    const alertId = payload.alertRuleId;

    // Check if this alert instance is responsible for the incoming payload
    const isMatch =
      alertId === this.alert.id ||
      alertId.replace(/-/g, "_") === this.alert.id.replace(/-/g, "_");

    if (isMatch) {
      // It matches, so evaluate the specific condition
      return this.checkRule(context, payload);
    }

    // If not a match, pass to the next handler in the chain
    if (this.nextAlert) {
      return this.nextAlert.shouldProcess(context, payload);
    }

    // Default to true if no handler in the chain matched (allow processing)
    return true;
  }

  // The actual rule check implemented by each alert subclass
  protected abstract checkRule(
    context: TContext,
    payload: EscalationAlertPayload,
  ): Promise<boolean> | boolean;
}
