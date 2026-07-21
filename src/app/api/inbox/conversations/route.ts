import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as inboxService from "@/server/modules/inbox/service";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const conversations = await inboxService.listConversations(db, session);
  return NextResponse.json(conversations);
}, { permission: "inbox.view" });
