import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { connectDB } from "@/server/db/client";
import { collections } from "@/server/db/collections";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/server/auth/jwt";

export interface Session {
  userId: string;
  name: string;
  email: string;
  color: string;
  roleIds: string[];
  permissions: Set<string>;
  /** União: accountIds concedidos por role + contas WhatsApp das quais este usuário é dono.
   *  Extensão deliberada em relação ao projeto de referência (Unidades eram só via role) —
   *  Contas WhatsApp são self-service, então o dono sempre tem acesso à própria conta. */
  accountIds: string[];
  allAccounts: boolean;
  /** true se o usuário tem a role padrão "Administrador" (a `isDefault`, criada no seed).
   *  Não é um gate exclusivo de módulo aqui (diferente do projeto de referência) — é só um
   *  "vê/gerencia tudo" de segurança, já que Contas WhatsApp são self-service por padrão. */
  isSuperAdmin: boolean;
}

/**
 * Resolve a sessão a partir do cookie a cada request, buscando roles/contas
 * no banco (não confia em claims embutidos no JWT) — assim revogar/alterar
 * uma role tem efeito imediato, sem esperar o token expirar.
 */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyAuthToken(token);
  if (!payload) return null;

  const db = await connectDB();
  const user = await collections.users(db).findOne({
    _id: ObjectId.createFromHexString(payload.userId),
    active: true,
  });
  if (!user) return null;

  const [roles, ownedAccounts] = await Promise.all([
    collections
      .roles(db)
      .find({ _id: { $in: user.roleIds } })
      .toArray(),
    collections
      .whatsappAccounts(db)
      .find({ ownerId: user._id }, { projection: { _id: 1 } })
      .toArray(),
  ]);

  const permissions = new Set<string>();
  const accountIds = new Set<string>(ownedAccounts.map((account) => account._id.toHexString()));
  let allAccounts = false;
  let isSuperAdmin = false;

  for (const role of roles) {
    for (const permission of role.permissions) {
      permissions.add(permission);
    }
    if (role.allAccounts) allAccounts = true;
    for (const accountId of role.accountIds ?? []) {
      accountIds.add(accountId.toHexString());
    }
    if (role.isDefault) isSuperAdmin = true;
  }

  return {
    userId: user._id.toHexString(),
    name: user.name,
    email: user.email,
    color: user.color,
    roleIds: user.roleIds.map((id) => id.toHexString()),
    permissions,
    accountIds: Array.from(accountIds),
    allAccounts,
    isSuperAdmin,
  };
}
