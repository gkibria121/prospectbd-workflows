import { EscalationAlertPayload } from "../../../common/workflow-schema";

export async function sendEscalationAlert(payload: EscalationAlertPayload): Promise<void> {
  const tag =
    payload.severity === "critical" ? "🔴 [ESCALATION CRITICAL]" : "🟡 [ESCALATION WARNING]";

  console.warn(
    `${tag} Escalation fired\n` +
      `  workflowId  : ${payload.workflowId}\n` +
      `  escalationId: ${payload.escalationId}\n` +
      `  label       : ${payload.label}\n` +
      `  duration    : ${payload.duration} ${payload.unit}\n` +
      `  notifyRoles : ${payload.notifyRoles.join(", ")}\n` +
      `  firedAt     : ${payload.firedAt}`,
  );
}
