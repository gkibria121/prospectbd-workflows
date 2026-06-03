import { z } from "zod";

export const UserRoleSchema = z.enum([
  "admin",
  "customer",
  "artwork-designer",
  "delivery-person",
  "vendor",
  "system",
]);
export const UserActionSchema = z.enum(["create", "read", "update", "delete"]);
export type UserAction = z.infer<typeof UserActionSchema>;

export const AppResourceSchema = z.enum([
  "product",
  "vendor",
  "vendor-product",
  "order",
  "customer",
  "quote",
  "printing-job",
  "delivery-job",
  "artwork-job",
  "order-item",
  "order-job",
  "invoice",
  "system",
]);
export type AppResource = z.infer<typeof AppResourceSchema>;

// Template literal type needs a custom refine since Zod doesn't support template literals natively
const validPermissions = AppResourceSchema.options.flatMap((resource) =>
  UserActionSchema.options.map((action) => `${resource}:${action}` as const),
);
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserPermission = `${AppResource}:${UserAction}`;

export const UserPermissionSchema = z
  .string()
  .superRefine((val, ctx) => {
    if (!validPermissions.includes(val as UserPermission)) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid permission "${val}". Must be one of: ${validPermissions.join(", ")}`,
      });
    }
  })
  .transform((val) => val as UserPermission);
