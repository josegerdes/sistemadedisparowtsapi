import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as campaignsService from "@/server/modules/campaigns/service";
import { createCampaignSchema } from "@/server/modules/campaigns/types";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const campaigns = await campaignsService.listCampaigns(db, session);
  return NextResponse.json(campaigns);
}, { permission: "campaigns.view" });

export const POST = withApiHandler(async (request, { session }) => {
  const body = await request.json();
  const input = createCampaignSchema.parse(body);
  requireAccountAccess(session, input.accountId);
  const db = await connectDB();
  const campaign = await campaignsService.createCampaign(db, session, input);
  return NextResponse.json(campaign, { status: 201 });
}, { permission: "campaigns.manage" });
