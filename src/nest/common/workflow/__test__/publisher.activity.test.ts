import { describe, it, expect, mock } from "bun:test";
import { createPublishEventActivity, publishEvent } from "../publisher.activity";
import type { WorkflowInstance } from "../../../../types";

function createMockInstance(event?: string): WorkflowInstance {
  return {
    workflowId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    event: event || "",
    definitionName: "test-def",
    resourceType: "order",
    currentState: {
      state: "confirmed",
      label: "Confirmed",
      description: "Order confirmed",
      progress: 50,
      requiredRoles: ["admin"],
      actions: [],
      escalations: [],
    },
    data: { test: "data" },
    history: [],
  };
}

describe("publisher.activity", () => {
  describe("createPublishEventActivity", () => {
    it("should emit a namespaced workflow event with state and payload metadata", async () => {
      const mockEmitter = {
        emit: mock(() => true),
      };

      const publishEventActivity = createPublishEventActivity(mockEmitter);
      const payload = createMockInstance("confirm");

      await publishEventActivity(payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith(
        "workflow.confirm",
        expect.objectContaining({
          workflowId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          eventId: "confirm",
          state: "confirmed",
          data: { test: "data" },
          result: payload,
          timestamp: expect.any(String),
        })
      );
    });

    it("should not emit anything if event is not specified", async () => {
      const mockEmitter = {
        emit: mock(() => true),
      };

      const publishEventActivity = createPublishEventActivity(mockEmitter);
      const payload = createMockInstance();
      payload.event = undefined as any;

      await publishEventActivity(payload);

      expect(mockEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("publishEvent (standalone fallback)", () => {
    it("should resolve immediately", async () => {
      const payload = createMockInstance("confirm");

      // Just ensure it doesn't crash or hang
      await expect(publishEvent(payload)).resolves.toBeUndefined();
    });
  });
});
