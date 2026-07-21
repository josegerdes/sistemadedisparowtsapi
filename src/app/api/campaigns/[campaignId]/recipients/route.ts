import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as campaignsService from "@/server/modules/campaigns/service";

export const GET = withApiHandler<{ params: { campaignId: string } }>(async (request: NextRequest, { params }) => {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "25");
  const db = await connectDB();
  const result = await campaignsService.getRecipients(db, params.campaignId, page, pageSize);
  return NextResponse.json(result);
}, { permission: "campaigns.view" });
