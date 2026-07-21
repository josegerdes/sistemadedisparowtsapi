import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as contactsService from "@/server/modules/contacts/service";
import { createContactSchema } from "@/server/modules/contacts/types";

export const GET = withApiHandler(async (request: NextRequest, { session }) => {
  const listId = request.nextUrl.searchParams.get("listId") ?? undefined;
  const db = await connectDB();
  const contacts = await contactsService.listContacts(db, session, listId);
  return NextResponse.json(contacts);
}, { permission: "contacts.view" });

export const POST = withApiHandler(async (request, { session }) => {
  const body = await request.json();
  const input = createContactSchema.parse(body);
  const db = await connectDB();
  const contact = await contactsService.createContact(db, session, input);
  return NextResponse.json(contact, { status: 201 });
}, { permission: "contacts.manage" });
