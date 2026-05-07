import { z } from "zod";
import {
  WorkflowConfig,
  WorkflowConfigSchema,
  WorkflowDto,
  WorkFlowStep,
  WorkflowHistory,
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
  history?: WorkflowHistory,
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

  // 1. If history is provided, find the path that matches the actual traversed edges
  if (history && history.length > 0) {
    const traversedEdges = new Set(
      history
        .filter((h) => h.fromStep !== null)
        .map((h) => `${h.fromStep}::${h.toStep}`),
    );

    const scoredPaths = allPaths.map((path) => {
      let score = 0;
      for (let i = 0; i < path.length - 1; i++) {
        if (traversedEdges.has(`${path[i]}::${path[i + 1]}`)) {
          score++;
        }
      }
      return { path, score };
    });

    // Sort by score DESC, then by length DESC as a tie-breaker
    scoredPaths.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.path.length - a.path.length;
    });

    const bestMatch = scoredPaths.find((p) => p.path.includes(currentStateId));
    // Only return if we actually found a path with some traversal history
    if (bestMatch && bestMatch.score > 0) {
      return bestMatch.path;
    }
  }

  // 2. Fallback: Sort descending by length so index-0 is always the longest
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
    [K in keyof T]: Record<T[K]["stateMachine"]["states"][number]["state"], string>;
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

  const progressMap = Object.fromEntries(
    Object.entries(workflows).map(([key, flow]) => [
      key,
      Object.fromEntries(
        flow.stateMachine.states.map((s: any) => [s.state, s.progress]),
      ),
    ]),
  ) as {
    [K in keyof T]: Record<T[K]["stateMachine"]["states"][number]["state"], number>;
  };

  return {
    WORKFLOWS: workflows,
    WORKFLOW_REGISTRY: registry,
    EVENT_MAP: eventMap,
    EVENT_IDS: eventIds as string[],
    EVENT_SCHEMAS: eventSchemas,
    STATE_MAP: stateMap,
    PROGRESS_MAP: progressMap,
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
export type WorkflowGraph = {
  nodes: Map<string, StateMeta>;
  // fromState → eventId → toState  (O(1) transition lookup)
  transitions: Map<string, Map<string, string>>;
  // Set of "fromState::eventId" pairs that were actually traversed
  traversedEdges: Set<string>;
  initialState: string;
  finalStates: Set<string>;
};

export type StateMeta = {
  label: string;
  description: string;
  actions: WorkflowDto["config"]["stateMachine"]["states"][number]["actions"];
  requiredRoles: string[];
  isFinal: boolean;
  isActive: boolean;
  isVisited: boolean;
};

export function buildGraph(workflow: WorkflowDto): WorkflowGraph {
  const nodes = new Map<string, StateMeta>();
  const transitions = new Map<string, Map<string, string>>();
  const finalStates = new Set(workflow.config.stateMachine.finalStates);

  const activeStateId =
    workflow.activeState?.state ||
    workflow.config.stateMachine.initialState;

  // Build visited set from history — every toStep that was reached
  const visitedStates = new Set<string>(
    (workflow.history ?? []).map((h) => h.toStep),
  );
  // The initial state is always considered visited
  visitedStates.add(workflow.config.stateMachine.initialState);

  // Build traversed edges set: "fromState::eventId" for each history entry
  const traversedEdges = new Set<string>(
    (workflow.history ?? [])
      .filter((h) => h.fromStep !== null)
      .map((h) => `${h.fromStep}::${h.eventId}`),
  );

  for (const s of workflow.config.stateMachine.states) {
    nodes.set(s.state, {
      label: s.label,
      description: s.description,
      actions: s.actions,
      requiredRoles: s.requiredRoles,
      isActive: s.state === activeStateId,
      isVisited: visitedStates.has(s.state),
      isFinal: finalStates.has(s.state),
    });
    transitions.set(s.state, new Map());
  }

  for (const t of workflow.config.stateMachine.transitions) {
    const from = t.fromState || "__ENTRY__";
    if (!transitions.has(from)) transitions.set(from, new Map());
    transitions.get(from)!.set(t.eventId, t.toState);
  }

  return {
    nodes,
    transitions,
    traversedEdges,
    initialState: workflow.config.stateMachine.initialState,
    finalStates,
  };
}

/**
 * Returns true if the edge from `fromState` via `eventId` was actually
 * traversed during this workflow's history.
 */
export function wasEdgeTraversed(
  graph: WorkflowGraph,
  fromState: string,
  eventId: string,
): boolean {
  return graph.traversedEdges.has(`${fromState}::${eventId}`);
}

// Usage — O(1) both lookups
function transition(
  graph: WorkflowGraph,
  currentState: string,
  event: string,
): string {
  const next = graph.transitions.get(currentState)?.get(event);
  if (!next)
    throw new Error(`No transition from "${currentState}" on "${event}"`);
  return next;
}
