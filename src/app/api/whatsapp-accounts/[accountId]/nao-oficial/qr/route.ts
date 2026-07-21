import { NextResponse } from "next/server";

import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as accountsService from "@/server/modules/whatsapp-accounts/service";

/** Polado pela UI enquanto o status da conta estiver "pending" — devolve o QR atual (base64) ou null. */
export const GET = withApiHandler<{ params: { accountId: string } }>(async (_request, { params, session }) => {
  requireAccountAccess(session, params.accountId);
  const qr = await accountsService.getNaoOficialQr(params.accountId);
  return NextResponse.json({ qr });
}, { permission: "whatsapp_accounts.view" });
