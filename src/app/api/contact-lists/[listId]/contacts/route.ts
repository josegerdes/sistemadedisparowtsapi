import { NextResponse } from "next/server";
import { z } from "zod";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as contactsService from "@/server/modules/contacts/service";

export const GET = withApiHandler<{ params: { listId: string } }>(async (_request, { params, session }) => {
  const db = await connectDB();
  const contacts = await contactsService.listContacts(db, session, params.listId);
  return NextResponse.json(contacts);
}, { permission: "contacts.view" });

const addSchema = z.object({ contactId: z.string() });

export const POST = withApiHandler<{ params: { listId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const { contactId } = addSchema.parse(body);
  const db = await connectDB();
  await contactsService.addToList(db, session, contactId, params.listId);
  return NextResponse.json({ ok: true });
}, { permission: "contacts.manage" });
