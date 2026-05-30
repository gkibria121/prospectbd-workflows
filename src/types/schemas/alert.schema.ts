import { z } from "zod";
import { AppResourceSchema, UserRoleSchema } from "./rbac.schema";
import { userSchema } from "./user.schema";

// ─── Alert Severity ──────────────────────────────────────────────────────────

export const AlertSeveritySchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["CRITICAL", "WARNING", "INFO", "SUCCESS", "DEBUG"]),
);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

// ─── Notification Channels ───────────────────────────────────────────────────

export const NotificationChannelsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  slack: z.boolean(),
});
export type NotificationChannels = z.infer<typeof NotificationChannelsSchema>;

// ─── Alert Rule ──────────────────────────────────────────────────────────────

const AlertRuleTemplateBaseSchema = z.object({
  name: z.string(),
  alertId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "Must be kebab-case (lowercase letters, numbers, and hyphens only)",
  }),
  severity: AlertSeveritySchema,
  channels: NotificationChannelsSchema,
  roles: z.array(UserRoleSchema).min(1, "Minimum one role must be specified."),
  template: z.string(),
  deduplicate: z.boolean(),
  payload: z
    .object({
      resourceType: AppResourceSchema,
      resourceId: z.string(),
      resourceNo: z.string().optional().nullable(),
    })
    .and(z.record(z.string(), z.unknown()))
    .optional(),
});

export const AlertRuleTemplateSchema = AlertRuleTemplateBaseSchema;

export const AlertRuleSchema = AlertRuleTemplateBaseSchema.superRefine(
  (data, ctx) => {
    const templateKeys = [...data.template.matchAll(/\{(\w+)\}/g)].map(
      (m) => m[1],
    );

    if (templateKeys.length === 0) return;

    const payloadKeys = new Set(Object.keys(data.payload ?? {}));

    for (const key of templateKeys) {
      if (!payloadKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["payload"],
          message: `Template references key "{${key}}" but it is missing from payload`,
        });
      }
    }
  },
);

export const AlertRuleTemplateDefineSchema = AlertRuleTemplateBaseSchema.omit({
  payload: true,
});

export type AlertRuleTemplate = z.infer<typeof AlertRuleTemplateSchema>;
export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertRuleTemplateDefine = z.infer<
  typeof AlertRuleTemplateDefineSchema
>;

// ─── Status ──────────────────────────────────────────────────────────────────

export const AlertStatusSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase() : val),
  z.enum(["unresolved", "acknowledged", "resolved"]),
);
export type StatusType = z.infer<typeof AlertStatusSchema>;

// ─── AlertTab ────────────────────────────────────────────────────────────────

export const AlertTabSchema = z.enum(["logs", "sandbox"]);
export type AlertTab = z.infer<typeof AlertTabSchema>;

export const AlertChannelSchema = z.enum(["EMAIL", "PUSH", "SLACK", "SMS"]);
export type AlertChannel = z.infer<typeof AlertChannelSchema>;

// ─── AlertLog ────────────────────────────────────────────────────────────────

export const AlertLogSchema = z.object({
  id: z.string(),
  ruleName: z.string(),
  alertId: z.string(),
  severity: AlertSeveritySchema,
  message: z.string(),
  status: AlertStatusSchema,
  timestamp: z.string(),
  acknowledgedAt: z.string().optional(),
  acknowledgedBy: userSchema.optional(),
  resolvedAt: z.string().optional(),
  resolvedBy: userSchema.optional(),
  triggerCount: z.number(),
  metadata: z
    .object({
      resourceType: AppResourceSchema.optional(),
      resourceId: z.string().optional(),
      reason: z.string().optional(),
      deeplink: z.string().optional(),
      timeLimit: z.string().optional(),
      expectedTime: z.string().optional(),
      action: z.string(),
      recipientUsers: z.array(userSchema).optional(),
      channels: z.array(AlertChannelSchema).optional(),
    })
    .optional(),
  firedAt: z.string().optional(),
  isNotEscalted: z.boolean().optional(),
});
export type AlertLog = z.infer<typeof AlertLogSchema>;

// ─── Alert Metrics ───────────────────────────────────────────────────────────

export const AlertMetricsSchema = z.object({
  mtta: z.number(),
  mttr: z.number(),
  ackCount: z.number(),
  resCount: z.number(),
});
export type AlertMetrics = z.infer<typeof AlertMetricsSchema>;

// ─── Paginated Logs Response ─────────────────────────────────────────────────

export const PaginatedLogsResponseSchema = z.object({
  logs: z.array(AlertLogSchema),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type PaginatedLogsResponse = z.infer<typeof PaginatedLogsResponseSchema>;

// ─── Custom Alert Data ───────────────────────────────────────────────────────

export const CustomAlertDataSchema = z.object({
  title: z.string(),
  message: z.string(),
  severity: AlertSeveritySchema,
  deeplink: z.string(),
  channels: NotificationChannelsSchema,
  recipientUsers: z.array(z.string()),
});
export type CustomAlertData = z.infer<typeof CustomAlertDataSchema>;

// ─── Alert Notification ──────────────────────────────────────────────────────

export const AlertNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  severity: AlertSeveritySchema,
});
export type AlertNotification = z.infer<typeof AlertNotificationSchema>;

// ─── API Request Schemas ─────────────────────────────────────────────────────

export const CreateAlertRuleTemplateSchema = AlertRuleTemplateBaseSchema;
export type CreateAlertRuleTemplate = z.infer<
  typeof CreateAlertRuleTemplateSchema
>;

export const UpdateAlertLogStatusSchema = z.object({
  status: AlertStatusSchema,
});
export type UpdateAlertLogStatus = z.infer<typeof UpdateAlertLogStatusSchema>;

export const DispatchSimulatedEventSchema = z.object({
  alertId: z.string(),
  payload: z.record(z.string(), z.any()),
  recipientUsers: z.array(z.string()).optional(),
});
export type DispatchSimulatedEvent = z.infer<
  typeof DispatchSimulatedEventSchema
>;

export const AlertSimulationResponseSchema = z.object({
  success: z.boolean(),
  status: z.enum(["no_rule", "stacked", "created"]),
  message: z.string(),
  ruleName: z.string().optional(),
  notification: AlertNotificationSchema.optional(),
});
export type AlertSimulationResponse = z.infer<
  typeof AlertSimulationResponseSchema
>;

export const AlertRuleTemplatesFilterSchema = z.object({
  searchQuery: z.string().optional(),
  severity: AlertSeveritySchema.or(z.literal("all")).optional(),
  role: z.string().optional(),
  users: z.string().optional(),
});
export type AlertRuleTemplatesFilter = z.infer<
  typeof AlertRuleTemplatesFilterSchema
>;

export const AlertLogsFilterSchema = z.object({
  searchQuery: z.string().optional(),
  severity: AlertSeveritySchema.or(z.literal("all")).optional(),
  status: AlertStatusSchema.or(z.literal("all")).optional(),
  role: z.string().optional(),
  users: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  perPage: z.coerce.number().int().positive().optional(),
});
export type AlertLogsFilter = z.infer<typeof AlertLogsFilterSchema>;

export const NotifiableUsersFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});
export type NotifiableUsersFilter = z.infer<typeof NotifiableUsersFilterSchema>;
