import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as campaignsService from "@/server/modules/campaigns/service";

export const POST = withApiHandler<{ params: { campaignId: string } }>(async (_request, { params }) => {
  const db = await connectDB();
  const campaign = await campaignsService.pauseCampaign(db, params.campaignId);
  return NextResponse.json(campaign);
}, { permission: "campaigns.manage" });
