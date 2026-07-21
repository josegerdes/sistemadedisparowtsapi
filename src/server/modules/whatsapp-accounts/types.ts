import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(2, "Informe um nome pra conta"),
  type: z.enum(["oficial", "nao_oficial"]),
  oficial: z
    .object({
      accessToken: z.string().min(10, "Informe o access token"),
      phoneNumberId: z.string().min(1, "Informe o phone_number_id"),
      wabaId: z.string().min(1, "Informe o WABA id"),
      businessAccountId: z.string().min(1, "Informe o business account id"),
    })
    .optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  oficial: z
    .object({
      accessToken: z.string().min(10).optional(),
      phoneNumberId: z.string().min(1).optional(),
      wabaId: z.string().min(1).optional(),
      businessAccountId: z.string().min(1).optional(),
    })
    .optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
