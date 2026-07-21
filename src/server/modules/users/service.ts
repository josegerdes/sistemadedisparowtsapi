import { Db, ObjectId } from "mongodb";

import { UserDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import { hashPassword } from "@/server/auth/password";
import * as usersRepo from "@/server/modules/users/repository";
import * as rolesRepo from "@/server/modules/roles/repository";
import { CreateUserInput, UpdateUserInput } from "@/server/modules/users/types";

/**
 * `users.manage` sozinho não pode conceder a role padrão "Administrador" a
 * ninguém — só quem também tem `roles.manage` (o dono de verdade do RBAC).
 */
async function assertCanAssignRoles(db: Db, session: Session, roleIds: ObjectId[]): Promise<void> {
  if (session.permissions.has("roles.manage")) return;
  if (!roleIds.length) return;
  const roles = await rolesRepo.findRolesByIds(db, roleIds);
  if (roles.some((role) => role.isDefault)) {
    throw new ApiError(403, "Só quem tem a permissão de gerenciar roles pode atribuir a role Administrador");
  }
}

const AVATAR_COLORS = ["#25D366", "#128C7E", "#34B7F1", "#ECE5DD", "#075E54", "#FEE75C", "#EB459E"];

function pickColor(seed: string): string {
  const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] as string;
}

export function toPublicUser(user: UserDoc) {
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    color: user.color,
    roleIds: user.roleIds.map((id) => id.toHexString()),
    active: user.active,
    createdAt: user.createdAt,
  };
}

export async function listUsers(db: Db) {
  const users = await usersRepo.findAllUsers(db);
  return users.map(toPublicUser);
}

export async function createUser(db: Db, session: Session, input: CreateUserInput) {
  const existing = await usersRepo.findUserByEmail(db, input.email);
  if (existing) throw new ApiError(409, "Já existe um usuário com este email");

  const roleIds = input.roleIds.map((id) => ObjectId.createFromHexString(id));
  if (roleIds.length) {
    const roles = await rolesRepo.findRolesByIds(db, roleIds);
    if (roles.length !== roleIds.length) throw new ApiError(422, "Uma ou mais roles são inválidas");
  }
  await assertCanAssignRoles(db, session, roleIds);

  const now = new Date();
  const user: UserDoc = {
    _id: new ObjectId(),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    roleIds,
    color: pickColor(input.email),
    active: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  };
  await usersRepo.insertUser(db, user);
  return toPublicUser(user);
}

export async function updateUser(db: Db, session: Session, userId: string, input: UpdateUserInput) {
  const patch: Partial<UserDoc> = {};
  if (input.name) patch.name = input.name;
  if (input.password) patch.passwordHash = await hashPassword(input.password);
  if (input.roleIds) {
    const roleIds = input.roleIds.map((id) => ObjectId.createFromHexString(id));
    const roles = await rolesRepo.findRolesByIds(db, roleIds);
    if (roles.length !== roleIds.length) throw new ApiError(422, "Uma ou mais roles são inválidas");
    await assertCanAssignRoles(db, session, roleIds);
    patch.roleIds = roleIds;
  }
  if (input.active !== undefined) patch.active = input.active;

  const updated = await usersRepo.updateUser(db, userId, patch);
  if (!updated) throw new ApiError(404, "Usuário não encontrado");
  return toPublicUser(updated);
}

/** Apaga de verdade — impede apagar a própria conta e impede apagar o último usuário
 *  que ainda tem a role padrão "Administrador" (evita ninguém mais conseguir gerenciar
 *  usuários/roles depois). */
export async function deleteUser(db: Db, session: Session, userId: string): Promise<void> {
  if (session.userId === userId) {
    throw new ApiError(422, "Você não pode apagar sua própria conta");
  }

  const user = await usersRepo.findUserById(db, userId);
  if (!user) throw new ApiError(404, "Usuário não encontrado");

  const allRoles = await rolesRepo.findAllRoles(db);
  const defaultRoleIds = new Set(allRoles.filter((role) => role.isDefault).map((role) => role._id.toHexString()));
  const userHasDefaultRole = user.roleIds.some((id) => defaultRoleIds.has(id.toHexString()));

  if (userHasDefaultRole) {
    const allUsers = await usersRepo.findAllUsers(db);
    const otherAdmins = allUsers.filter(
      (u) => u._id.toHexString() !== userId && u.roleIds.some((id) => defaultRoleIds.has(id.toHexString()))
    );
    if (otherAdmins.length === 0) {
      throw new ApiError(422, "Não é possível apagar o último usuário com a role de Administrador");
    }
  }

  await usersRepo.deleteUser(db, userId);
}
