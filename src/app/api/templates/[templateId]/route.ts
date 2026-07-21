import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as templatesService from "@/server/modules/templates/service";

export const DELETE = withApiHandler<{ params: { templateId: string } }>(async (_request, { params }) => {
  const db = await connectDB();
  await templatesService.deleteTemplate(db, params.templateId);
  return NextResponse.json({ ok: true });
}, { permission: "templates.manage" });
