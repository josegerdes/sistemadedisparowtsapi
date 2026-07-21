import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as accountsService from "@/server/modules/whatsapp-accounts/service";
import { createAccountSchema } from "@/server/modules/whatsapp-accounts/types";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const accounts = await accountsService.listAccounts(db, session);
  return NextResponse.json(accounts);
}, { permission: "whatsapp_accounts.view" });

/** Self-service: qualquer usuário com `whatsapp_accounts.manage` pode cadastrar sua própria
 *  conta WhatsApp — vira dono automaticamente (ver `session.ts`, escopo por `ownerId`). */
export const POST = withApiHandler(async (request, { session }) => {
  const body = await request.json();
  const input = createAccountSchema.parse(body);
  const db = await connectDB();
  const account = await accountsService.createAccount(db, session, input);
  return NextResponse.json(account, { status: 201 });
}, { permission: "whatsapp_accounts.manage" });
