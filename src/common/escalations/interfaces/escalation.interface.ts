import { AlertConfig, WorkflowConfig, WorkflowEscalation } from "src/types";

export abstract class EscalationStrategy<
  T extends WorkflowConfig,
  G extends AlertConfig[] = AlertConfig[],
> {
  alerts: G;
  escalationMap: {
    state: T["stateMachine"]["states"][number]["state"] | "root";
    definitionName?: T["definitionName"];
    escalation: Omit<WorkflowEscalation, "id"> & {
      id: G[number]["id"];
    };
  }[];
  injectEscalations(config: T) {
    const updatedConfig: T = {
      ...config,
      alerts: this.alerts,
      stateMachine: {
        ...config.stateMachine,
        escalations: [
          ...(config.stateMachine.escalations ?? []),
          ...this.escalationMap
            .filter(
              (em) =>
                em.state === "root" &&
                config.definitionName === em.definitionName,
            )
            .map((em) => em.escalation),
        ],
        states: [
          ...config.stateMachine.states.map((state) => ({
            ...state,
            escalations: [
              ...(state.escalations ?? []),
              ...this.escalationMap
                .filter((em) => em.state === state.state)
                .map((em) => em.escalation),
            ],
          })),
        ],
      },
    };
    return updatedConfig;
  }
}
