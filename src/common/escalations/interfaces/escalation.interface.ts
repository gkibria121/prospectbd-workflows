import { AlertConfig, WorkflowConfig, WorkflowEscalation } from "src/types";

export abstract class EscalationStrategy<
  T extends WorkflowConfig,
  G extends readonly AlertConfig[] = readonly AlertConfig[],
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
                (em.definitionName
                  ? config.definitionName === em.definitionName
                  : true),
            )
            .map((em) => em.escalation),
        ],
        states: [
          ...config.stateMachine.states.map((state) => ({
            ...state,
            escalations: [
              ...(state.escalations ?? []),
              ...this.escalationMap
                .filter((em) =>
                  em.state === state.state &&
                  (em.definitionName
                    ? em.definitionName === config.definitionName
                    : true),
                )
                .map((em) => em.escalation),
            ],
          })),
        ],
      },
    };
    return updatedConfig;
  }
}
