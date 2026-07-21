import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { collections } from "@/server/db/collections";
import { withApiHandler } from "@/server/http/with-api-handler";

/**
 * Lista só `{id, name}` de TODAS as contas WhatsApp do sistema — usado pela
 * tela de Roles pra montar os checkboxes de acesso a conta, independente da
 * role de quem está logado. Diferente de `/api/whatsapp-accounts` (a gestão
 * de verdade, com dados de conexão), que é escopada pelo acesso da sessão.
 */
export const GET = withApiHandler(async () => {
  const db = await connectDB();
  const accounts = await collections
    .whatsappAccounts(db)
    .find()
    .sort({ name: 1 })
    .project({ name: 1 })
    .toArray();
  return NextResponse.json(accounts.map((account) => ({ id: account._id.toHexString(), name: account.name })));
});
