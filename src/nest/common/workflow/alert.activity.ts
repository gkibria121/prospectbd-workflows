import { EscalationAlertPayload } from "../../../common/workflow-schema";

export async function sendEscalationAlert(payload: EscalationAlertPayload): Promise<void> {
  const tag = "🟡 [ESCALATION ALERT]";

  console.warn(
    `${tag} Escalation fired\n` +
      `  workflowId  : ${payload.workflowId}\n` +
      `  alertId     : ${payload.alertId}\n` +
      `  duration    : ${payload.duration} ${payload.unit}\n` +
      `  firedAt     : ${payload.firedAt}`,
  );
}
