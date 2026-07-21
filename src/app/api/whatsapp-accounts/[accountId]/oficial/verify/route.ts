import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as accountsService from "@/server/modules/whatsapp-accounts/service";

export const POST = withApiHandler<{ params: { accountId: string } }>(async (_request, { params, session }) => {
  requireAccountAccess(session, params.accountId);
  const db = await connectDB();
  const account = await accountsService.verifyOficialCredentials(db, params.accountId);
  return NextResponse.json(account);
}, { permission: "whatsapp_accounts.manage" });
