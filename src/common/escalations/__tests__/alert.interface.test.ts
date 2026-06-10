import { describe, it, expect } from "bun:test";
import { IAlert } from "../interfaces/alert.interface";
import type { AlertConfig, EscalationAlertPayload } from "../../../types";

class MockAlert extends IAlert {
  readonly alert: AlertConfig = {
    id: "test-alert",
    name: "Test Alert",
    severity: "WARNING",
    roles: ["admin"],
    template: "Template message",
    channels: { email: true, sms: false, push: false, slack: false, inApp: true },
    deduplicate: true,
  };

  public checkRuleResult = true;

  protected checkRule(context: any, payload: EscalationAlertPayload): boolean {
    return this.checkRuleResult;
  }
}

class AnotherMockAlert extends IAlert {
  readonly alert: AlertConfig = {
    id: "another-alert",
    name: "Another Alert",
    severity: "CRITICAL",
    roles: ["admin"],
    template: "Another template",
    channels: { email: false, sms: false, push: false, slack: false, inApp: true },
    deduplicate: false,
  };

  public checkRuleResult = false;

  protected checkRule(context: any, payload: EscalationAlertPayload): boolean {
    return this.checkRuleResult;
  }
}

function createMockPayload(alertRuleId: string): EscalationAlertPayload {
  return {
    definitionName: "test",
    alertRuleId,
    resourceType: "order",
    resourceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    firedAt: new Date().toISOString(),
    duration: 5,
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

describe("IAlert", () => {
  it("should support setNext to chain alerts", () => {
    const alert1 = new MockAlert();
    const alert2 = new AnotherMockAlert();

    const returned = alert1.setNext(alert2);

    expect(returned).toBe(alert2);
    expect((alert1 as any).nextAlert).toBe(alert2);
  });

  it("should resolve getEscalation correctly", () => {
    const alert = new MockAlert();
    const trigger = {
      after: { duration: 5, unit: "minutes" as const },
    };

    const escalation = alert.getEscalation(trigger);

    expect(escalation).toEqual({
      after: { duration: 5, unit: "minutes" },
      id: "test-alert",
      alertRule: alert.alert,
      actionType: "send-sla",
    });
  });

  describe("shouldProcess", () => {
    it("should evaluate checkRule if the payload matches the alert id", async () => {
      const alert = new MockAlert();
      alert.checkRuleResult = false;

      const payload = createMockPayload("test-alert");

      const result = await alert.shouldProcess({}, payload);
      expect(result).toBe(false);
    });

    it("should match formatting underscore variant of rules", async () => {
      const alert = new MockAlert(); // id: test-alert
      alert.checkRuleResult = true;

      const payload = createMockPayload("test_alert");

      const result = await alert.shouldProcess({}, payload);
      expect(result).toBe(true);
    });

    it("should pass to nextAlert in the chain if rule ID does not match", async () => {
      const alert1 = new MockAlert(); // id: test-alert
      const alert2 = new AnotherMockAlert(); // id: another-alert
      alert1.setNext(alert2);

      alert2.checkRuleResult = true;

      const payload = createMockPayload("another-alert");

      // shouldProcess on alert1 should delegate to alert2 because payload matches another-alert
      const result = await alert1.shouldProcess({}, payload);
      expect(result).toBe(true);
    });

    it("should return default true if no handler in the chain matched", async () => {
      const alert1 = new MockAlert(); // id: test-alert
      const alert2 = new AnotherMockAlert(); // id: another-alert
      alert1.setNext(alert2);

      const payload = createMockPayload("unmatched-id");

      const result = await alert1.shouldProcess({}, payload);
      expect(result).toBe(true);
    });
  });

  describe("getHandler", () => {
    it("should return the matching handler in the chain", () => {
      const alert1 = new MockAlert();
      const alert2 = new AnotherMockAlert();
      alert1.setNext(alert2);

      const payload = createMockPayload("another-alert");

      const handler = alert1.getHandler(payload);
      expect(handler).toBe(alert2);
    });

    it("should return null if no handler in the chain matches", () => {
      const alert1 = new MockAlert();
      const alert2 = new AnotherMockAlert();
      alert1.setNext(alert2);

      const payload = createMockPayload("unmatched-alert");

      const handler = alert1.getHandler(payload);
      expect(handler).toBeNull();
    });
  });

  describe("getContext", () => {
    it("should return empty object by default", async () => {
      const alert = new MockAlert();
      const context = await alert.getContext({}, {} as any);
      expect(context).toEqual({});
    });
  });
});
