import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as listsService from "@/server/modules/contact-lists/service";
import { updateListSchema } from "@/server/modules/contact-lists/types";

export const PATCH = withApiHandler<{ params: { listId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const input = updateListSchema.parse(body);
  const db = await connectDB();
  const list = await listsService.updateList(db, session, params.listId, input);
  return NextResponse.json(list);
}, { permission: "contacts.manage" });

export const DELETE = withApiHandler<{ params: { listId: string } }>(async (_request, { params, session }) => {
  const db = await connectDB();
  await listsService.deleteList(db, session, params.listId);
  return NextResponse.json({ ok: true });
}, { permission: "contacts.manage" });
