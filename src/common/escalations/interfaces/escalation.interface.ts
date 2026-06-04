import { AlertConfig, WorkflowConfig, WorkflowEscalation } from "src/types";

type EscalationEntry<T extends WorkflowConfig> = {
  state: T["stateMachine"]["states"][number]["state"] | "root";
  definitionName?: T["definitionName"];
  escalation: WorkflowEscalation & { alertRule: AlertConfig };
};

export abstract class EscalationStrategy<T extends WorkflowConfig> {
  escalationMap: EscalationEntry<T>[];

  // ── Filtering ────────────────────────────────────────────────────────────

  private matchesDefinition(
    entry: EscalationEntry<T>,
    definitionName: T["definitionName"],
  ): boolean {
    return !entry.definitionName || entry.definitionName === definitionName;
  }

  private getRootEscalations(
    definitionName: T["definitionName"],
  ): EscalationEntry<T>[] {
    return this.escalationMap.filter(
      (entry) =>
        entry.state === "root" && this.matchesDefinition(entry, definitionName),
    );
  }

  private getStateEscalations(
    stateName: T["stateMachine"]["states"][number]["state"],
    definitionName: T["definitionName"],
  ): EscalationEntry<T>[] {
    return this.escalationMap.filter(
      (entry) =>
        entry.state === stateName &&
        this.matchesDefinition(entry, definitionName),
    );
  }

  // ── Mapping ──────────────────────────────────────────────────────────────

  private extractEscalation(
    entry: EscalationEntry<T>,
  ): WorkflowEscalation & { alertRule: AlertConfig } {
    return entry.escalation;
  }

  private extractAlertRule(entry: EscalationEntry<T>): AlertConfig {
    return entry.escalation.alertRule;
  }

  private toEscalations(
    entries: EscalationEntry<T>[],
  ): (WorkflowEscalation & { alertRule: AlertConfig })[] {
    return entries.map((entry) => this.extractEscalation(entry));
  }

  private toAlertRules(entries: EscalationEntry<T>[]): AlertConfig[] {
    return entries.map((entry) => this.extractAlertRule(entry));
  }

  // ── Collecting ───────────────────────────────────────────────────────────

  private collectUsedAlerts(
    rootEntries: EscalationEntry<T>[],
    stateEntriesPerState: EscalationEntry<T>[][],
  ): AlertConfig[] {
    const fromRoot = this.toAlertRules(rootEntries);
    const fromStates = stateEntriesPerState.flatMap((entries) =>
      this.toAlertRules(entries),
    );
    return [...fromRoot, ...fromStates];
  }

  // ── Assembly ─────────────────────────────────────────────────────────────

  private buildUpdatedStates(
    config: T,
    stateEntriesPerState: EscalationEntry<T>[][],
  ): T["stateMachine"]["states"] {
    return config.stateMachine.states.map((state, index) => ({
      ...state,
      escalations: [
        ...(state.escalations ?? []),
        ...this.toEscalations(stateEntriesPerState[index]),
      ],
    }));
  }

  // ── Public API ───────────────────────────────────────────────────────────

  injectEscalations(config: T): T {
    const { definitionName } = config;

    const rootEntries = this.getRootEscalations(definitionName);
    const stateEntriesPerState = config.stateMachine.states.map((state) =>
      this.getStateEscalations(state.state, definitionName),
    );

    const usedAlerts = this.collectUsedAlerts(
      rootEntries,
      stateEntriesPerState,
    );
    const updatedStates = this.buildUpdatedStates(config, stateEntriesPerState);

    return {
      ...config,
      alerts: usedAlerts,
      stateMachine: {
        ...config.stateMachine,
        escalations: [
          ...(config.stateMachine.escalations ?? []),
          ...this.toEscalations(rootEntries),
        ],
        states: updatedStates,
      },
    };
  }
}
