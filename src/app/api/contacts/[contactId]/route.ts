import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as contactsService from "@/server/modules/contacts/service";
import { updateContactSchema } from "@/server/modules/contacts/types";

export const PATCH = withApiHandler<{ params: { contactId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const input = updateContactSchema.parse(body);
  const db = await connectDB();
  const contact = await contactsService.updateContact(db, session, params.contactId, input);
  return NextResponse.json(contact);
}, { permission: "contacts.manage" });

export const DELETE = withApiHandler<{ params: { contactId: string } }>(async (_request, { params, session }) => {
  const db = await connectDB();
  await contactsService.deleteContact(db, session, params.contactId);
  return NextResponse.json({ ok: true });
}, { permission: "contacts.manage" });
