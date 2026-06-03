import { EscalationAlertPayload } from "../../../common/workflow-schema";

export function createSendEscalationAlertActivity(emitter: {
  emit: (event: string, payload: any) => boolean;
}) {
  return async function sendEscalationAlert(
    payload: EscalationAlertPayload,
  ): Promise<void> {
    const eventName = `workflow-alert.${payload.definitionName}.${payload.alertRuleId}`;
    emitter.emit(eventName, payload);
  };
}

export async function sendEscalationAlert(
  payload: EscalationAlertPayload,
): Promise<void> {
  const tag = "🟡 [ESCALATION ALERT]";

  console.warn(
    `${tag} Escalation fired\n` +
      `  resourceType: ${payload.resourceType}\n` +
      `  resourceId  : ${payload.resourceId}\n` +
      `  alertRuleId : ${payload.alertRuleId}\n` +
      `  duration    : ${payload.duration} ${payload.unit}\n` +
      `  firedAt     : ${payload.firedAt}`,
  );
}
