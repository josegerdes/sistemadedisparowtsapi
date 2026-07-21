import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as accountsService from "@/server/modules/whatsapp-accounts/service";
import { updateAccountSchema } from "@/server/modules/whatsapp-accounts/types";

export const PATCH = withApiHandler<{ params: { accountId: string } }>(async (request, { params, session }) => {
  requireAccountAccess(session, params.accountId);
  const body = await request.json();
  const input = updateAccountSchema.parse(body);
  const db = await connectDB();
  const account = await accountsService.updateAccount(db, params.accountId, input);
  return NextResponse.json(account);
}, { permission: "whatsapp_accounts.manage" });

export const DELETE = withApiHandler<{ params: { accountId: string } }>(async (_request, { params, session }) => {
  requireAccountAccess(session, params.accountId);
  const db = await connectDB();
  await accountsService.deleteAccount(db, params.accountId);
  return NextResponse.json({ ok: true });
}, { permission: "whatsapp_accounts.manage" });
