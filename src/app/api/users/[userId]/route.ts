import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as usersService from "@/server/modules/users/service";
import { updateUserSchema } from "@/server/modules/users/types";

export const PATCH = withApiHandler<{ params: { userId: string } }>(async (request, { params, session }) => {
  const body = await request.json();
  const input = updateUserSchema.parse(body);
  const db = await connectDB();
  const user = await usersService.updateUser(db, session, params.userId, input);
  return NextResponse.json(user);
}, { permission: "users.manage" });

export const DELETE = withApiHandler<{ params: { userId: string } }>(async (_request, { params, session }) => {
  const db = await connectDB();
  await usersService.deleteUser(db, session, params.userId);
  return NextResponse.json({ ok: true });
}, { permission: "users.manage" });
