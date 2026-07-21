import { z } from "zod";

const buttonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
  text: z.string().min(1),
  url: z.string().url().optional(),
  phoneNumber: z.string().optional(),
});

const componentSchema = z.object({
  type: z.enum(["HEADER", "BODY", "FOOTER", "BUTTONS"]),
  format: z.enum(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]).optional(),
  text: z.string().optional(),
  buttons: z.array(buttonSchema).optional(),
});

export const createTemplateSchema = z.object({
  accountId: z.string(),
  name: z
    .string()
    .min(2)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore (regra da Meta)"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string().min(2),
  components: z.array(componentSchema).min(1, "Adicione ao menos o corpo (BODY) da mensagem"),
  variableSamples: z.record(z.string()).default({}),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
