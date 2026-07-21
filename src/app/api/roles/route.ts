import { NextResponse } from "next/server";

import { connectDB } from "@/server/db/client";
import { withApiHandler } from "@/server/http/with-api-handler";
import * as rolesService from "@/server/modules/roles/service";
import { createRoleSchema } from "@/server/modules/roles/types";

/** Sem gate de permissão além de estar autenticado: a tela de Usuários precisa
 *  disso pra mostrar badge/nome de role. Atribuir uma role (em especial a
 *  Administrador) é o que é restrito, em `users/service.ts#assertCanAssignRoles`. */
export const GET = withApiHandler(async () => {
  const db = await connectDB();
  const roles = await rolesService.listRoles(db);
  return NextResponse.json(roles);
});

export const POST = withApiHandler(async (request) => {
  const body = await request.json();
  const input = createRoleSchema.parse(body);
  const db = await connectDB();
  const role = await rolesService.createRole(db, input);
  return NextResponse.json(role, { status: 201 });
}, { permission: "roles.manage" });
