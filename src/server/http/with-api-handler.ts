import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSession, Session } from "@/server/auth/session";
import { ApiError, requireAuth, requirePermission, requireSuperAdmin } from "@/server/auth/guards";
import { MetaApiError } from "@/server/whatsapp/meta-errors";

type Handler<Ctx> = (request: NextRequest, ctx: { session: Session } & Ctx) => Promise<Response>;

interface Options {
  permission?: string;
  requireSuperAdmin?: boolean;
}

/**
 * Padroniza autenticação/autorização e o formato de erro das rotas de API.
 */
export function withApiHandler<Ctx = Record<string, never>>(
  handler: Handler<Ctx>,
  options: Options = {}
) {
  return async (request: NextRequest, routeCtx: Ctx): Promise<Response> => {
    try {
      const session = requireAuth(await getSession());
      if (options.requireSuperAdmin) {
        requireSuperAdmin(session);
      }
      if (options.permission) {
        requirePermission(session, options.permission);
      }
      return await handler(request, { session, ...routeCtx });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "Dados inválidos", issues: error.issues },
          { status: 422 }
        );
      }
      if (error instanceof MetaApiError) {
        // Erro 4xx da Graph API é problema com os dados enviados (corrigível pelo usuário,
        // ex: variável de template faltando) — repassa a mensagem de verdade em vez de
        // disfarçar como "Erro interno". Erro 5xx/instabilidade da Meta vira 502.
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        console.error("[Meta]", error.status, error.message);
        return NextResponse.json({ message: error.message }, { status });
      }
      console.error(error);
      return NextResponse.json({ message: "Erro interno" }, { status: 500 });
    }
  };
}
