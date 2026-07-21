import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as inboxService from "@/server/modules/inbox/service";
import { sendReplySchema } from "@/server/modules/inbox/types";

export const GET = withApiHandler<{ params: { conversationId: string } }>(async (_request, { params }) => {
  const db = await connectDB();
  const messages = await inboxService.getMessages(db, params.conversationId);
  return NextResponse.json(messages);
}, { permission: "inbox.view" });

export const POST = withApiHandler<{ params: { conversationId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const input = sendReplySchema.parse(body);
  const db = await connectDB();
  const message = await inboxService.sendReply(db, session, params.conversationId, input);
  return NextResponse.json(message, { status: 201 });
}, { permission: "inbox.manage" });
