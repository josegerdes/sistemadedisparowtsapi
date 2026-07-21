import { z } from "zod";

import { ALL_PERMISSIONS } from "@/server/rbac/permissions";

export const createRoleSchema = z.object({
  name: z.string().min(2, "Informe o nome da role"),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Cor inválida"),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]),
  allAccounts: z.boolean().default(false),
  accountIds: z.array(z.string()).default([]),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial();
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const reorderRolesSchema = z.object({
  orderedIds: z.array(z.string()),
});
export type ReorderRolesInput = z.infer<typeof reorderRolesSchema>;
