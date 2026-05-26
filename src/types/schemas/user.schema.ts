import { z } from "zod";

export const userBaseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export const userSchema = userBaseSchema.omit({
  password: true,
});

export type User = z.infer<typeof userSchema>;
