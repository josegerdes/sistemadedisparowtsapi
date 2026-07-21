import { Session } from "@/server/auth/session";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requireAuth(session: Session | null): Session {
  if (!session) throw new ApiError(401, "Não autenticado");
  return session;
}

export function requirePermission(session: Session, permission: string): void {
  if (!session.permissions.has(permission)) {
    throw new ApiError(403, `Permissão necessária: ${permission}`);
  }
}

export function requireSuperAdmin(session: Session): void {
  if (!session.isSuperAdmin) {
    throw new ApiError(403, "Só o administrador geral pode fazer isso");
  }
}

export function requireAccountAccess(session: Session, accountId: string): void {
  if (session.allAccounts) return;
  if (!session.accountIds.includes(accountId)) {
    throw new ApiError(403, "Você não tem acesso a esta conta WhatsApp");
  }
}

export interface AccountAccessScope {
  /** `null` = sem restrição (usuário tem `allAccounts`, direto ou via alguma role). */
  accountIds: string[] | null;
}

/** Resolve o escopo de contas da sessão pros repositórios montarem o filtro `$in` de listagem. */
export function resolveAccountAccessScope(session: Session): AccountAccessScope {
  return { accountIds: session.allAccounts ? null : session.accountIds };
}
