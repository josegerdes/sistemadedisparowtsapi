import { z } from "zod";

export const createContactSchema = z.object({
  phone: z.string().min(8, "Informe um telefone válido"),
  name: z.string().optional(),
  customFields: z.record(z.string()).default({}),
  tags: z.array(z.string()).default([]),
  listIds: z.array(z.string()).default([]),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  name: z.string().optional(),
  customFields: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  optedOut: z.boolean().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const importCsvSchema = z.object({
  csv: z.string().min(1, "Arquivo CSV vazio"),
});
export type ImportCsvInput = z.infer<typeof importCsvSchema>;
