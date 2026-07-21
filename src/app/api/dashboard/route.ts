import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { getDashboardSummary } from "@/server/modules/dashboard/service";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const summary = await getDashboardSummary(db, session);
  return NextResponse.json(summary);
}, { permission: "dashboard.view" });
