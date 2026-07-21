import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as accountsService from "@/server/modules/whatsapp-accounts/service";

export const POST = withApiHandler<{ params: { accountId: string } }>(async (_request, { params, session }) => {
  requireAccountAccess(session, params.accountId);
  const db = await connectDB();
  await accountsService.subscribeOficialWebhook(db, params.accountId);
  return NextResponse.json({ ok: true });
}, { permission: "whatsapp_accounts.manage" });
