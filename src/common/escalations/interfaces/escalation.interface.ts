import { AlertConfig, WorkflowConfig, WorkflowEscalation } from "src/types";

export abstract class EscalationStrategy {
  alerts: AlertConfig[];
  escalations: Record<string, WorkflowEscalation>;
  escalationMap: {
    state: string;
    escalation: WorkflowEscalation;
  }[];
  constructor() {
    this.escalationMap = Object.keys(this.escalations).map((e) => ({
      state: e,
      escalation: this.escalations[e],
    }));
  }
  injectEscalations(config: WorkflowConfig) {
    const updatedConfig: WorkflowConfig = {
      ...config,
      alerts: this.alerts,
      stateMachine: {
        ...config.stateMachine,
        escalations: [
          ...(config.stateMachine.escalations ?? []),
          ...this.escalationMap
            .filter((em) => em.state === "root")
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
