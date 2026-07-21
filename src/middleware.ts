import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/server/auth/constants";

const PUBLIC_PATHS = ["/login"];

/**
 * Redirect leve em edge runtime, baseado só na presença do cookie (o Edge
 * runtime não tem acesso ao driver do Mongo para validar a sessão de verdade).
 * A validação forte (assinatura do JWT + usuário ativo + permissões) acontece
 * em cada Server Component/rota via `getSession()`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
