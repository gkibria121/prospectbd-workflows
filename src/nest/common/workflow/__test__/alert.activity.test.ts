import { describe, it, expect, mock, spyOn } from "bun:test";
import { createSendEscalationAlertActivity, sendEscalationAlert } from "../alert.activity";
import { WORKFLOW_ALERT_PREFIX } from "../../../../common/workflow-events";
import type { EscalationAlertPayload } from "../../../../types";

function createMockPayload(alertRuleId: string): EscalationAlertPayload {
  return {
    definitionName: "test-def",
    alertRuleId,
    resourceType: "order",
    resourceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    firedAt: "2026-06-10T00:00:00.000Z",
    duration: 10,
    durationUnit: "minutes",
    unit: "minutes",
    action: "sla_escalation",
    alertConfig: {
      id: alertRuleId,
      name: "Test Alert",
      severity: "WARNING",
      roles: ["admin"],
      template: "Template message",
      channels: { email: true, sms: false, push: false, slack: false, inApp: true },
      deduplicate: true,
    },
  };
}

describe("alert.activity", () => {
  describe("createSendEscalationAlertActivity", () => {
    it("should emit namespaced alert event with payload", async () => {
      const mockEmitter = {
        emit: mock(() => true),
      };

      const sendEscalationAlertActivity = createSendEscalationAlertActivity(mockEmitter);
      const payload = createMockPayload("alert-id");

      await sendEscalationAlertActivity(payload);

      const expectedEventName = `${WORKFLOW_ALERT_PREFIX}.test-def.alert-id`;
      expect(mockEmitter.emit).toHaveBeenCalledWith(expectedEventName, payload);
    });
  });

  describe("sendEscalationAlert (standalone)", () => {
    it("should log escalation details via console.warn", async () => {
      const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
      const payload = createMockPayload("alert-id");

      await sendEscalationAlert(payload);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("🟡 [ESCALATION ALERT] Escalation fired");
      expect(callArg).toContain("resourceType: order");
      expect(callArg).toContain("resourceId  : aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
      expect(callArg).toContain("alertRuleId : alert-id");
      expect(callArg).toContain("duration    : 10 minutes");

      consoleWarnSpy.mockRestore();
    });
  });
});
