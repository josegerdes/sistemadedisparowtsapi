import { z } from "zod";

export const createListSchema = z.object({
  name: z.string().min(2, "Informe um nome pra lista"),
  description: z.string().optional(),
});
export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
});
export type UpdateListInput = z.infer<typeof updateListSchema>;
