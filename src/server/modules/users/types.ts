import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Informe um email válido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  roleIds: z.array(z.string()).default([]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(8).optional(),
  roleIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
