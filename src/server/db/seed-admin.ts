import { ObjectId } from "mongodb";
import { Db } from "mongodb";

import { collections } from "@/server/db/collections";
import { hashPassword } from "@/server/auth/password";
import { ALL_PERMISSIONS } from "@/server/rbac/permissions";

/**
 * Cria a role Administrador + o usuário administrador inicial se ainda não
 * existir nenhum usuário. Idempotente — seguro de chamar toda vez que o
 * processo sobe (necessário porque o build standalone do Docker não inclui
 * `tsx`/fonte, então `npm run seed` não roda dentro do container publicado).
 */
export async function seedInitialAdmin(db: Db): Promise<void> {
  const userCount = await collections.users(db).countDocuments();
  if (userCount > 0) {
    console.log("[seed] Ignorado: já existem usuários.");
    return;
  }

  const now = new Date();
  const adminRole = {
    _id: new ObjectId(),
    name: "Administrador",
    color: "#25D366",
    position: 1,
    permissions: ALL_PERMISSIONS,
    allAccounts: true,
    accountIds: [],
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
  await collections.roles(db).insertOne(adminRole);

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@disparo.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin12345";

  await collections.users(db).insertOne({
    _id: new ObjectId(),
    name: "Administrador",
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    roleIds: [adminRole._id],
    color: "#25D366",
    active: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`[seed] Usuário administrador criado: ${email} / ${password}`);
  console.log("[seed] Troque a senha assim que possível.");
}
