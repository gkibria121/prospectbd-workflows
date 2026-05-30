import { defineWorkflowSystem } from "./workflow-utils";
import { ORDER_FLOW_CONFIG } from "./definitions/order-flow";
import { ORDER_ITEM_FLOW_CONFIG } from "./definitions/order-item-flow";
import { QUOTE_FLOW_CONFIG } from "./definitions/quote-flow";
import { JOB_FLOW_CONFIG } from "./definitions/job-flow";
import { ARTWORK_FLOW_CONFIG } from "./definitions/artwork-flow";
import { REFUND_FLOW_CONFIG } from "./definitions/refund-flow";
import { PRODUCTION_FLOW_CONFIG } from "./definitions/production-flow";
import { DELIVERY_FLOW_CONFIG } from "./definitions/delivery-flow";

export {
  ORDER_FLOW_CONFIG,
  ORDER_ITEM_FLOW_CONFIG,
  QUOTE_FLOW_CONFIG,
  JOB_FLOW_CONFIG,
  ARTWORK_FLOW_CONFIG,
  REFUND_FLOW_CONFIG,
  PRODUCTION_FLOW_CONFIG,
  DELIVERY_FLOW_CONFIG,
};

export const WORKFLOW_SYSTEM = defineWorkflowSystem({
  order: ORDER_FLOW_CONFIG,
  "order-item": ORDER_ITEM_FLOW_CONFIG,
  quote: QUOTE_FLOW_CONFIG,
  "order-job": JOB_FLOW_CONFIG,
  artwork: ARTWORK_FLOW_CONFIG,
  refund: REFUND_FLOW_CONFIG,
  production: PRODUCTION_FLOW_CONFIG,
  delivery: DELIVERY_FLOW_CONFIG,
});

export const { WORKFLOWS, WORKFLOW_REGISTRY } = WORKFLOW_SYSTEM;
