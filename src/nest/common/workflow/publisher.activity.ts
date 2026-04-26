// publisher.activity.ts

import { WorkflowInstance } from "../../../common/workflow-schema";

/**
 * Factory that creates the publishEvent activity with access to an EventEmitter2.
 * When an emitter is provided, it emits a namespaced `workflow.<eventId>` event
 * so that in-process listeners can react.
 * Falls back to console.log when no emitter is available.
 */
export function createPublishEventActivity(emitter: {
  emit: (event: string, payload: any) => boolean;
}) {
  return async function publishEvent(payload: WorkflowInstance): Promise<void> {
    console.log(
      `[${payload.workflowId}] ${payload.event} → ${JSON.stringify(payload.currentState?.state)}`,
    );

    if (payload.event) {
      const eventName = `workflow.${payload.event}`;
      emitter.emit(eventName, {
        workflowId: payload.workflowId,
        eventId: payload.event,
        state: payload.currentState?.state,
        data: payload.data,
        result: payload,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Default (standalone) publishEvent for backward compatibility.
 * Used when the worker doesn't inject an EventEmitter2.
 */
export async function publishEvent(payload: WorkflowInstance): Promise<void> {
  console.log(
    `[${payload.workflowId}] ${payload.event} → ${payload.currentState}`,
  );
  await new Promise((resolve) => resolve({}));
}
