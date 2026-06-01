/**
 * Unit tests for the generic Temporal workflow defined in workflows.ts.
 *
 * Strategy:
 *   Mock @temporalio/workflow so the workflow behaves like a normal async function.
 *   The 'condition' mock is key: it returns a Promise that only resolves when
 *   its predicate becomes true. We manually trigger a check after signals.
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPublishEvent = mock(() => Promise.resolve());
const mockSendEscalationAlert = mock(() => Promise.resolve());

/** Captured signal / query handlers. */
const handlers = new Map<any, (...args: any[]) => any>();

/** Currently active condition awaiters. */
let conditionWaiters: {
  predicate: () => boolean;
  resolve: (val: boolean) => void;
}[] = [];

/** Flag to simulate timeout. */
let forceConditionTimeout = false;

/** Manual trigger to re-evaluate all active conditions. */
function notifyCondition() {
  const stillWaiting: typeof conditionWaiters = [];
  for (const waiter of conditionWaiters) {
    if (waiter.predicate()) {
      waiter.resolve(true);
    } else if (forceConditionTimeout) {
      forceConditionTimeout = false;
      waiter.resolve(false);
    } else {
      stillWaiting.push(waiter);
    }
  }
  conditionWaiters = stillWaiting;
}

mock.module("@temporalio/workflow", () => ({
  defineSignal: (name: string) => Symbol.for(name),
  defineQuery: (name: string) => Symbol.for(name),
  setHandler: (def: any, fn: (...args: any[]) => any) => {
    handlers.set(def, fn);
  },
  proxyActivities: () => ({
    publishEvent: mockPublishEvent,
    sendEscalationAlert: mockSendEscalationAlert,
  }),
  condition: (predicate: () => boolean, timeoutMs?: number) => {
    // 1. Simulate timeout if requested
    if (forceConditionTimeout && timeoutMs !== undefined) {
      forceConditionTimeout = false;
      return Promise.resolve(false);
    }
    // 2. Resolve immediately if predicate is already true
    if (predicate()) {
      return Promise.resolve(true);
    }
    // 3. Otherwise, block until notified via notifyCondition()
    return new Promise<boolean>((resolve) => {
      conditionWaiters.push({ predicate, resolve });
    });
  },
  sleep: () => new Promise((r) => setTimeout(r, 0)),
}));

mock.module("../activities", () => ({
  publishEvent: mockPublishEvent,
  sendEscalationAlert: mockSendEscalationAlert,
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────
const {
  workflow,
  triggerEventSignal,
  getInstanceQuery,
  getConfigQuery,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require("../workflows") as typeof import("../workflows");

import type {
  WorkflowConfig,
  TriggerEventPayload,
  WorkflowInstance,
} from "../../../../types";

// ── Test Fixtures ─────────────────────────────────────────────────────────────

function createTestConfig(
  overrides: Partial<WorkflowConfig> = {},
): WorkflowConfig {
  const base: WorkflowConfig = {
    workflowId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    definitionName: "test-workflow",
    resourceType: "order",
    events: [
      { eventId: "create", name: "Create", icon: "✨" },
      { eventId: "confirm", name: "Confirm", icon: "✓" },
      { eventId: "complete", name: "Complete", icon: "✓" },
      { eventId: "expired", name: "Expired", icon: "⏰" },
    ],
    alerts: [
      {
        id: "test-alert",
        name: "Test Alert",
        severity: "WARNING",
        roles: ["admin"],
        template: "Test SLA",
        channels: { email: true, sms: false, push: false, slack: false },
        deduplicate: false,
      },
      {
        id: "early",
        name: "Early Alert",
        severity: "WARNING",
        roles: ["admin"],
        template: "Test SLA",
        channels: { email: true, sms: false, push: false, slack: false },
        deduplicate: false,
      },
    ],
    stateMachine: {
      initialState: "pending",
      finalStates: ["completed", "expired-state"],
      states: [
        {
          state: "pending",
          label: "Pending",
          description: "Awaiting confirmation",
          requiredRoles: [],
          actions: [
            {
              eventId: "confirm",
              label: "Confirm",
              icon: "✓",
              variant: "bluePrimary",
            },
          ],
          escalations: [],
        },
        {
          state: "confirmed",
          label: "Confirmed",
          description: "Order confirmed",
          requiredRoles: ["admin"],
          actions: [
            {
              eventId: "complete",
              label: "Complete",
              icon: "✓",
              variant: "greenSuccess",
            },
          ],
          escalations: [],
        },
        {
          state: "completed",
          label: "Completed",
          description: "Order completed",
          requiredRoles: [],
          actions: [],
          escalations: [],
        },
        {
          state: "expired-state",
          label: "Expired",
          description: "Order expired",
          requiredRoles: [],
          actions: [],
          escalations: [],
        },
      ],
      transitions: [

        { fromState: "pending", toState: "confirmed", eventId: "confirm" },
        { fromState: "confirmed", toState: "completed", eventId: "complete" },
        { fromState: "pending", toState: "expired-state", eventId: "expired" },
        {
          fromState: "confirmed",
          toState: "expired-state",
          eventId: "expired",
        },
      ],
      escalations: [],
    },
  } as WorkflowConfig;

  if (overrides.stateMachine) {
    return {
      ...base,
      ...overrides,
      stateMachine: { ...base.stateMachine, ...overrides.stateMachine },
    } as WorkflowConfig;
  }
  return { ...base, ...overrides } as WorkflowConfig;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSignalHandler(): (payload: TriggerEventPayload) => void {
  const h = handlers.get(triggerEventSignal);
  if (!h) throw new Error("signal handler not found");
  return h as any;
}

function getQueryHandler(): () => WorkflowInstance {
  const h = handlers.get(getInstanceQuery);
  if (!h) throw new Error("query handler not found");
  return h as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Temporal workflow()", () => {
  beforeEach(() => {
    mockPublishEvent.mockClear();
    mockSendEscalationAlert.mockClear();
    handlers.clear();
    conditionWaiters = [];
    forceConditionTimeout = false;
  });

  it("completes happy path: pending -> confirmed -> completed", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    // Yield to let handlers register
    await new Promise((r) => setTimeout(r, 0));

    const signal = getSignalHandler();

    // 1. Trigger confirm
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: { note: "step 1" },
      userRoles: ["customer"],
    });
    notifyCondition();

    // Yield to let the loop process
    await new Promise((r) => setTimeout(r, 10));

    // 2. Trigger complete
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: { note: "step 2" },
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;

    expect(result.currentState?.state).toBe("completed");
    expect(result.history).toHaveLength(2);
    expect(result.history[0].toStep).toBe("confirmed");
    expect(result.history[1].toStep).toBe("completed");

    // Check publications
    // 1: confirm -> confirmed
    // 2: complete -> completed
    expect(mockPublishEvent).toHaveBeenCalledTimes(2);
    expect(mockPublishEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: `${config.definitionName}.confirm`,
        currentState: expect.objectContaining({ state: "confirmed" }),
      }),
    );
  });

  it("merges data and handles initial data", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config, { meta: "test" });

    await new Promise((r) => setTimeout(r, 0));
    const signal = getSignalHandler();

    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: { user: "alice" },
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: { approved: true },
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.data).toMatchObject({
      meta: "test",
      user: "alice",
      approved: true,
    });

    // Verify first publish had the initial data merged
    expect(mockPublishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `${config.definitionName}.confirm`,
        data: expect.objectContaining({ meta: "test", user: "alice" }),
      }),
    );
  });

  it("rejects unauthorized transitions based on requiredRoles", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 0));
    const signal = getSignalHandler();
    const query = getQueryHandler();

    // first move to confirmed
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // and try completing with wrong role (requires admin)
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    expect(query().currentState?.state).toBe("confirmed");

    // now use admin
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("completed");
  });

  it("silently ignores non-existent eventId", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 0));
    const signal = getSignalHandler();
    const query = getQueryHandler();

    signal({
      workflowId: config.workflowId!,
      eventId: "junk",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    expect(query().currentState?.state).toBe("pending");

    // complete it
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("completed");
  });

  it("fires raise-event escalation and transitions", async () => {
    const config = createTestConfig({
      stateMachine: {
        ...createTestConfig().stateMachine,
        escalations: [
          {
            id: "esc-1",
            after: { duration: 1, unit: "minutes" },
            actionType: "raise-event",
            eventId: "expired",
          },
        ],
      },
    });

    forceConditionTimeout = true; // should fire escalation

    const result = await workflow(config);
    expect(result.currentState?.state).toBe("expired-state");
  });

  it("fires send-sla escalation and alert activity", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "test-alert",
        after: { duration: 5, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    forceConditionTimeout = true;
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEscalationAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alertRuleId: "test-alert",
      }),
    );

    // complete workflow after SLA
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("completed");
  });

  it("make sure sla is fired when conditions are met", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "test-alert", // The alert must exist in config.alerts for the condition to be met
        after: { duration: 15, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    // Force condition to simulate time passing (condition is met)
    forceConditionTimeout = true;
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    expect(mockSendEscalationAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        alertRuleId: "test-alert",
        duration: 15,
        unit: "minutes",
      }),
    );

    // Cleanly complete workflow
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("completed");
  });

  it("handles getConfig and getInstance queries", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 0));
    const getConfig = handlers.get(getConfigQuery)!;
    const getInstance = handlers.get(getInstanceQuery)!;

    expect(getConfig()).toEqual(config);
    expect(getInstance().currentState?.state).toBe("pending");

    // transition and check again
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    expect(getInstance().currentState?.state).toBe("confirmed");
  });

  it("fires global escalation across states", async () => {
    const config = createTestConfig({
      stateMachine: {
        ...createTestConfig().stateMachine,
        escalations: [
          {
            id: "global-1",
            after: { duration: 10, unit: "minutes" },
            actionType: "raise-event",
            eventId: "expired",
          },
        ],
      },
    });

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    forceConditionTimeout = true;
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("expired-state");
  });

  it("picks the earliest escalation when multiple are active", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "late",
        after: { duration: 10, unit: "minutes" },
        actionType: "send-sla",
      },
      {
        id: "early",
        after: { duration: 1, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    forceConditionTimeout = true;
    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    expect(mockSendEscalationAlert).toHaveBeenCalledWith(
      expect.objectContaining({ alertRuleId: "early" }),
    );
    expect(mockSendEscalationAlert).not.toHaveBeenCalledWith(
      expect.objectContaining({ alertRuleId: "late" }),
    );
  });

  it("publishes an event on final state transition", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 0));
    const signal = getSignalHandler();

    // 1. Move to confirmed
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // 2. Move to completed (final)
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    await workflowPromise;

    // Check that publishEvent was called for two transitions
    expect(mockPublishEvent).toHaveBeenCalledTimes(2);
    expect(mockPublishEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: expect.stringContaining("confirm"),
        currentState: expect.objectContaining({ state: "confirmed" }),
      }),
    );
    expect(mockPublishEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: expect.stringContaining("complete"),
        currentState: expect.objectContaining({ state: "completed" }),
      }),
    );
  });

  it("resets step-level escalation when manual transition occurs before timeout", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "pending-esc",
        after: { duration: 1, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    // Manual transition before timeout
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // Now trigger a timeout (simulate time passing that would have triggered the old escalation)
    forceConditionTimeout = true;
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // The old escalation should NOT have fired because it was tied to the 'pending' state
    expect(mockSendEscalationAlert).not.toHaveBeenCalled();
    const getInstance = handlers.get(getInstanceQuery)!;
    expect(getInstance().currentState?.state).toBe("confirmed");
  });

  it("persists global escalation across multiple state transitions", async () => {
    const config = createTestConfig({
      stateMachine: {
        ...createTestConfig().stateMachine,
        escalations: [
          {
            id: "global-timeout",
            after: { duration: 10, unit: "minutes" },
            actionType: "raise-event",
            eventId: "expired",
          },
        ],
      },
    });

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    // Transition 1: pending -> confirmed
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    const getInstance = handlers.get(getInstanceQuery)!;
    expect(getInstance().currentState?.state).toBe("confirmed");

    // Timeout fires global escalation
    forceConditionTimeout = true;
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("expired-state");
    expect(result.history).toContainEqual(
      expect.objectContaining({ toStep: "expired-state" }),
    );
    expect(result.history[0].toStep).toBe("confirmed");
    expect(result.history[0].eventId).toBe(`${config.definitionName}.confirm`);
  });

  it("deduplicates triggered escalations so they don't fire twice in the same state", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "test-alert",
        after: { duration: 5, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    // 1. Fire escalation first time
    forceConditionTimeout = true;
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));
    expect(mockSendEscalationAlert).toHaveBeenCalledTimes(1);

    // 2. Simulate another timeout in the same state
    // In a real scenario, this would happen if there's another escalation later,
    // but here we want to ensure the logic doesn't re-run the same one.
    forceConditionTimeout = true;
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // Still only 1 call
    expect(mockSendEscalationAlert).toHaveBeenCalledTimes(1);

    // Complete workflow
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("completed");
  });

  it("does not fire send-sla escalation if alert rule is missing in config", async () => {
    const config = createTestConfig();
    const pendingState = config.stateMachine.states.find(
      (s) => s.state === "pending",
    )!;
    pendingState.escalations = [
      {
        id: "missing-alert-id",
        after: { duration: 5, unit: "minutes" },
        actionType: "send-sla",
      },
    ];

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    forceConditionTimeout = true;
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // Shouldn't fire because missing-alert-id is not in config.alerts
    expect(mockSendEscalationAlert).not.toHaveBeenCalled();

    // Complete workflow
    const signal = getSignalHandler();
    signal({
      workflowId: config.workflowId!,
      eventId: "confirm",
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();
    
    await workflowPromise;
  });

  it("does not double-prefix eventId if it already includes definitionName", async () => {
    const config = createTestConfig();
    const workflowPromise = workflow(config);

    await new Promise((r) => setTimeout(r, 0));
    const signal = getSignalHandler();

    // Trigger confirm but pass fully qualified eventId
    signal({
      workflowId: config.workflowId!,
      eventId: `${config.definitionName}.confirm`,
      data: {},
      userRoles: ["customer"],
    });
    notifyCondition();
    await new Promise((r) => setTimeout(r, 10));

    // Complete it
    signal({
      workflowId: config.workflowId!,
      eventId: "complete",
      data: {},
      userRoles: ["admin"],
    });
    notifyCondition();
    
    const result = await workflowPromise;
    expect(result.history[0].eventId).toBe(`${config.definitionName}.confirm`);
  });

  it("injects proper data payload when raise-event escalation fires", async () => {
    const config = createTestConfig({
      stateMachine: {
        ...createTestConfig().stateMachine,
        escalations: [
          {
            id: "global-esc-raise",
            after: { duration: 1, unit: "minutes" },
            actionType: "raise-event",
            eventId: "expired",
          },
        ],
      },
    });

    const workflowPromise = workflow(config);
    await new Promise((r) => setTimeout(r, 10));

    forceConditionTimeout = true;
    notifyCondition();

    const result = await workflowPromise;
    expect(result.currentState?.state).toBe("expired-state");
    expect(result.history[0].data).toMatchObject({
      resourceType: config.resourceType,
      id: config.workflowId!,
      escalationId: "global-esc-raise",
    });
    expect(result.history[0].data).toHaveProperty("timestamp");
  });
});
