import { z } from "zod";

export const sendReplySchema = z.object({
  body: z.string().min(1, "Digite uma mensagem"),
});
export type SendReplyInput = z.infer<typeof sendReplySchema>;
