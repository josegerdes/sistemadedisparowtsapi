import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { collections } from "@/server/db/collections";
import { withApiHandler } from "@/server/http/with-api-handler";
import { resolveAccountAccessScope } from "@/server/auth/guards";
import { buildAccountIdCondition } from "@/server/db/account-filter";

/** Contas WhatsApp que a sessão atual pode acessar — usado pelo seletor de conta no topo. */
export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const condition = buildAccountIdCondition(resolveAccountAccessScope(session));
  const query = condition ? { _id: condition } : {};
  const accounts = await collections.whatsappAccounts(db).find(query).sort({ name: 1 }).toArray();
  return NextResponse.json(
    accounts.map((account) => ({ id: account._id.toHexString(), name: account.name, type: account.type, status: account.status }))
  );
});
