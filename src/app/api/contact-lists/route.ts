import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as listsService from "@/server/modules/contact-lists/service";
import { createListSchema } from "@/server/modules/contact-lists/types";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const lists = await listsService.listLists(db, session);
  return NextResponse.json(lists);
}, { permission: "contacts.view" });

export const POST = withApiHandler(async (request, { session }) => {
  const body = await request.json();
  const input = createListSchema.parse(body);
  const db = await connectDB();
  const list = await listsService.createList(db, session, input);
  return NextResponse.json(list, { status: 201 });
}, { permission: "contacts.manage" });
