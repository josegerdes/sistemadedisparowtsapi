import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as templatesService from "@/server/modules/templates/service";

export const POST = withApiHandler<{ params: { templateId: string } }>(async (_request, { params }) => {
  const db = await connectDB();
  const template = await templatesService.syncTemplateStatus(db, params.templateId);
  return NextResponse.json(template);
}, { permission: "templates.manage" });
