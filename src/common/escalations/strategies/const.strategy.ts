import { AlertConfig } from "src/types";

export const ALERTS = [
  {
    name: "Inquiry Unclaimed",
    id: "inquiry-unclaimed",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: false,
    },
    roles: ["admin"],
    template:
      "Action required: Inquiry {orderNo} has not been claimed by any admin after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Quote Not Generated",
    id: "quote-not-generated",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin"],
    template:
      "Action required: Order {orderNo} requires a quote, but no quote or invoice has been generated after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Quote Not Viewed",
    id: "quote-not-viewed",
    severity: "WARNING",
    channels: {
      email: true,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin"],
    template:
      "Warning: Quote for order {orderNo} has not been viewed by the customer after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Artwork Pending Review",
    id: "artwork-pending-review",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: false,
    },
    roles: ["admin", "artwork-designer"],
    template:
      "Action required: Paid order {orderNo} has not moved into artwork review after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Production Not Assigned",
    id: "production-not-assigned",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin", "vendor"],
    template:
      "Action required: Artwork approved for order {orderNo}, but no production run or vendor has been assigned after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Ready For Collection Delay Risk",
    id: "ready-for-collection-delay-risk",
    severity: "CRITICAL",
    channels: {
      email: true,
      sms: true,
      push: true,
      slack: true,
    },
    roles: ["admin", "vendor", "delivery-person"],
    template:
      "Critical alert: Order {orderNo} may miss the planned collection-ready time. Delivery deadline: {deliveryDeadline}. Planned ready time: {plannedReadyTime}.",
    deduplicate: true,
  },
  {
    name: "Courier Not Assigned",
    id: "courier-not-assigned",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin", "delivery-person"],
    template:
      "Action required: Delivery required for order {orderNo}, but no courier has been assigned after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Courier Confirmation Pending",
    id: "courier-confirmation-pending",
    severity: "TASK",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin", "delivery-person"],
    template:
      "Action required: Courier assigned to order {orderNo} has not acknowledged the assignment after {duration} {durationUnit}.",

    deduplicate: true,
  },
  {
    name: "Courier Not Dispatched",
    id: "courier-not-dispatched",
    severity: "WARNING",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin", "delivery-person"],
    template:
      "Warning: Courier collected order {orderNo}, but dispatch/in-transit status has not started near the delivery SLA.",
    deduplicate: true,
  },
  {
    name: "Delivery ETA Risk",
    id: "delivery-eta-risk",
    severity: "WARNING",
    channels: {
      email: false,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin", "delivery-person"],
    template:
      "Warning: Delivery ETA for order {orderNo} is close to the promised delivery time. ETA: {eta}. Deadline: {deliveryDeadline}.",
    deduplicate: true,
  },
  {
    name: "Delivery Overdue",
    id: "delivery-overdue",
    severity: "CRITICAL",
    channels: {
      email: true,
      sms: true,
      push: true,
      slack: true,
    },
    roles: ["admin", "delivery-person"],
    template:
      "Critical alert: Order {orderNo} has exceeded the promised delivery time. Deadline: {deliveryDeadline}. Current time: {currentTime}.",
    deduplicate: true,
  },
  {
    name: "Refund Requested",
    id: "refund-requested",
    severity: "WARNING",
    channels: {
      email: true,
      sms: false,
      push: true,
      slack: true,
    },
    roles: ["admin"],
    template:
      "Warning: Refund or compensation request received for order {orderNo}. Supervisor review required.",
    deduplicate: true,
  },
] as const satisfies readonly AlertConfig[];
