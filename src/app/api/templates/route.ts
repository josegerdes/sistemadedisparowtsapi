import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import { requireAccountAccess } from "@/server/auth/guards";
import * as templatesService from "@/server/modules/templates/service";
import { createTemplateSchema } from "@/server/modules/templates/types";

export const GET = withApiHandler(async (_request, { session }) => {
  const db = await connectDB();
  const templates = await templatesService.listTemplates(db, session);
  return NextResponse.json(templates);
}, { permission: "templates.view" });

export const POST = withApiHandler(async (request, { session }) => {
  const body = await request.json();
  const input = createTemplateSchema.parse(body);
  requireAccountAccess(session, input.accountId);
  const db = await connectDB();
  const template = await templatesService.createTemplate(db, input);
  return NextResponse.json(template, { status: 201 });
}, { permission: "templates.manage" });
