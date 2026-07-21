import { z } from "zod";

const variableSourceSchema = z.object({
  source: z.enum(["field", "literal"]),
  value: z.string(),
});

export const createCampaignSchema = z.object({
  accountId: z.string(),
  templateId: z.string(),
  name: z.string().min(2, "Informe um nome pra campanha"),
  listIds: z.array(z.string()).default([]),
  adHocContactIds: z.array(z.string()).default([]),
  variableMapping: z.record(variableSourceSchema).default({}),
  scheduledFor: z.string().datetime().nullable().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(1000).default(60),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
