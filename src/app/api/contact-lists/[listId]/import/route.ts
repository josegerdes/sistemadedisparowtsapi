import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as contactsService from "@/server/modules/contacts/service";
import { importCsvSchema } from "@/server/modules/contacts/types";

export const POST = withApiHandler<{ params: { listId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const input = importCsvSchema.parse(body);
  const db = await connectDB();
  const summary = await contactsService.importCsv(db, session, params.listId, input);
  return NextResponse.json(summary);
}, { permission: "contacts.manage" });
