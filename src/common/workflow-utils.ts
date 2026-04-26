import { z } from "zod";
import {
  WorkflowConfig,
  WorkflowConfigSchema,
  WorkFlowStep,
} from "./workflow-schema";

/**
 * DFS to enumerate every simple path from `start` to any finalState.
 * Returns an array of paths, each path being an ordered array of state IDs.
 */
export function getAllPaths(
  start: string,
  finalStates: Set<string>,
  adjacency: Map<string, string[]>,
): string[][] {
  const results: string[][] = [];

  function dfs(node: string, path: string[], visited: Set<string>) {
    if (finalStates.has(node)) {
      results.push([...path]);
      return;
    }
    const neighbours = adjacency.get(node) ?? [];
    for (const next of neighbours) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(next, path, visited);
        path.pop();
        visited.delete(next);
      }
    }
  }

  const visited = new Set<string>([start]);
  dfs(start, [start], visited);
  return results;
}

export function resolveDisplayPath(
  config: WorkflowConfig,
  currentStateId: string,
): string[] {
  const { initialState, finalStates, transitions } = config.stateMachine;

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const t of transitions) {
    if (!adjacency.has(t.fromState)) adjacency.set(t.fromState, []);
    adjacency.get(t.fromState)!.push(t.toState);
  }

  const finalSet = new Set(finalStates);
  const allPaths = getAllPaths(initialState, finalSet, adjacency);

  if (allPaths.length === 0) return [initialState];

  // Sort descending by length so index-0 is always the longest
  allPaths.sort((a, b) => b.length - a.length);

  const longestPath = allPaths[0];

  // If currentState lives on the longest path, use it
  if (longestPath.includes(currentStateId)) return longestPath;

  // Otherwise, find the longest path that contains currentState
  const fallback = allPaths.find((p) => p.includes(currentStateId));
  return fallback ?? longestPath;
}

export function getReachableStates<E extends WorkflowConfig>(
  config: E,
  fromState: E["stateMachine"]["states"][number]["state"],
): {
  state: E["stateMachine"]["states"][number]["state"];
  eventId: E["events"][number]["eventId"];
  label?: string;
}[] {
  return config.stateMachine.transitions
    .filter((t) => t.fromState === fromState)
    .map((t) => {
      const state = config.stateMachine.states.find(
        (s) => s.state === t.toState,
      );
      return {
        state: t.toState,
        eventId: t.eventId,
        label: state?.label,
      };
    });
}

export function isFinalState(config: WorkflowConfig, currentStateId: string) {
  const finalStateSet = new Set(config.stateMachine.finalStates);
  return finalStateSet.has(currentStateId);
}

export const hasIntersection = (a: string[], b: string[]) => {
  const setA = new Set(a);
  return b.some((item) => setA.has(item));
};

export function validateWorkflow<T extends WorkflowConfig>(
  config: T,
  throwError: boolean = false,
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: { path: string; message: string }[];
    } {
  const result = WorkflowConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: config };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  if (throwError) {
    throw new Error(errors.map((e) => e.message).join(", "));
  }
  return { success: false, errors };
}

export function durationToMs(
  duration: number,
  unit: "minutes" | "hours" | "days",
): number {
  const multipliers = {
    minutes: 60_000,
    hours: 3_600_000,
    days: 86_400_000,
  } as Record<string, number>;
  return duration * multipliers[unit];
}

/**
 * Factory for creating structured workflow definitions.
 * Returns an object containing the original config plus a namespaced 'Events' map for type-safe usage.
 */
export function defineWorkflow<const T extends WorkflowConfig>(config: T) {
  // Validate at definition time
  validateWorkflow(config, true);

  // Derive namespaced events for autocomplete and safety
  const events = Object.fromEntries(
    config.events.map((e) => [
      e.eventId,
      `${config.definitionName}.${e.eventId}` as const,
    ]),
  ) as {
    [E in T["events"][number]["eventId"]]: `${T["definitionName"]}.${E}`;
  };

  return {
    ...config,
    Events: events,
  } as const;
}

/**
 * Unified factory for defining the entire workflow system.
 * Generates all necessary registries, maps, and types from a single configuration object.
 */
export function defineWorkflowSystem<T extends Record<string, any>>(
  workflows: T,
) {
  // 1. Registry mapped by definitionName
  const registry = Object.fromEntries(
    Object.values(workflows).map((flow) => [flow.definitionName, flow]),
  ) as {
    [K in T[keyof T]["definitionName"]]: Extract<
      T[keyof T],
      { definitionName: K }
    >;
  };

  // 2. Global Event Map (nested by registration key)
  const eventMap = Object.fromEntries(
    Object.entries(workflows).map(([key, flow]) => [key, flow.Events]),
  ) as {
    [K in keyof T]: T[K]["Events"];
  };
  const stateMap = Object.fromEntries(
    Object.entries(workflows).map(([key, flow]) => [
      key,
      Object.fromEntries(
        flow.stateMachine.states.map((s: any) => [s.state, s.state]),
      ),
    ]),
  ) as {
    [K in keyof T]: T[K]["stateMachine"]["states"][number]["state"];
  };
  const eventIds = Object.values(workflows).flatMap((flow) =>
    Object.values(flow.Events),
  );

  // 3. Harvest Event Schemas for validation
  const eventSchemas = Object.values(workflows).reduce((acc, flow) => {
    const schemas = Object.fromEntries(
      (flow.events as any[])
        .filter((e: any) => e.schema)
        .map((e: any) => [`${flow.definitionName}.${e.eventId}`, e.schema]),
    );
    return { ...acc, ...schemas };
  }, {} as any);

  return {
    WORKFLOWS: workflows,
    WORKFLOW_REGISTRY: registry,
    EVENT_MAP: eventMap,
    EVENT_IDS: eventIds as string[],
    EVENT_SCHEMAS: eventSchemas,
    STATE_MAP: stateMap,
    /** Validates payload data against the schema defined for the given eventId (if any) */
    validateEventPayload: (eventId: string, data: any) => {
      const schema = eventSchemas[eventId];
      if (!schema) return { success: true, data };
      return schema.safeParse(data);
    },
  } as const;
}

export interface TreeLayoutNode {
  id: string;
  label: string;
  depth: number;
  yOrder: number;
  isInitial: boolean;
  isFinal: boolean;
}

export interface TreeLayoutEdge {
  from: string;
  to: string;
  eventId: string;
  label?: string;
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  edges: TreeLayoutEdge[];
  maxDepth: number;
  maxWidth: number;
}

/**
 * Calculates a basic tree layout (levels and y-positions) for a workflow state machine.
 */
export function calculateTreeLayout(config: WorkflowConfig): TreeLayout {
  const { initialState, finalStates, transitions, states } =
    config.stateMachine;
  const stateMap = new Map(states.map((s) => [s.state, s]));
  const finalSet = new Set(finalStates);

  // Build adjacency
  const adj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  for (const t of transitions) {
    if (t.fromState === "") continue;
    if (!adj.has(t.fromState)) adj.set(t.fromState, []);
    adj.get(t.fromState)!.push(t.toState);

    if (!reverseAdj.has(t.toState)) reverseAdj.set(t.toState, []);
    reverseAdj.get(t.toState)!.push(t.fromState);
  }

  const levels: Record<string, number> = {};
  const queue: [string, number][] = [[initialState, 0]];
  levels[initialState] = 0;

  // BFS to assign depths
  while (queue.length > 0) {
    const [curr, d] = queue.shift()!;
    const neighbors = adj.get(curr) ?? [];
    for (const next of neighbors) {
      if (!(next in levels)) {
        levels[next] = d + 1;
        queue.push([next, d + 1]);
      } else {
        // If already visited, depth is the max to avoid back-arrows going "forward" in level
        levels[next] = Math.max(levels[next], d + 1);
      }
    }
  }

  // Group by depth
  const depthGroups: Record<number, string[]> = {};
  let maxDepth = 0;
  for (const [stateId, depth] of Object.entries(levels)) {
    if (!depthGroups[depth]) depthGroups[depth] = [];
    depthGroups[depth].push(stateId);
    maxDepth = Math.max(maxDepth, depth);
  }

  // Calculate y-order for each depth
  const nodes: TreeLayoutNode[] = [];
  let maxWidth = 0;
  for (let d = 0; d <= maxDepth; d++) {
    const statesAtDepth = depthGroups[d] || [];
    maxWidth = Math.max(maxWidth, statesAtDepth.length);
    statesAtDepth.forEach((stateId, idx) => {
      const stateDef = stateMap.get(stateId);
      nodes.push({
        id: stateId,
        label: stateDef?.label || stateId,
        depth: d,
        yOrder: idx,
        isInitial: stateId === initialState,
        isFinal: finalSet.has(stateId),
      });
    });
  }

  const edges: TreeLayoutEdge[] = transitions
    .filter((t) => t.fromState !== "")
    .map((t) => ({
      from: t.fromState,
      to: t.toState,
      eventId: t.eventId,
      label: config.events.find((e) => e.eventId === t.eventId)?.name,
    }));

  return { nodes, edges, maxDepth, maxWidth };
}
