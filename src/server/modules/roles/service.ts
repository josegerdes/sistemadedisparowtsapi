import { Db, ObjectId } from "mongodb";

import { RoleDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import * as rolesRepo from "@/server/modules/roles/repository";
import { CreateRoleInput, ReorderRolesInput, UpdateRoleInput } from "@/server/modules/roles/types";

export function toPublicRole(role: RoleDoc) {
  return {
    id: role._id.toHexString(),
    name: role.name,
    color: role.color,
    position: role.position,
    permissions: role.permissions,
    allAccounts: role.allAccounts,
    accountIds: (role.accountIds ?? []).map((id) => id.toHexString()),
    isDefault: role.isDefault,
  };
}

export async function listRoles(db: Db) {
  const roles = await rolesRepo.findAllRoles(db);
  return roles.map(toPublicRole);
}

export async function createRole(db: Db, input: CreateRoleInput) {
  const now = new Date();
  const role: RoleDoc = {
    _id: new ObjectId(),
    name: input.name,
    color: input.color,
    position: await rolesRepo.nextPosition(db),
    permissions: input.permissions,
    allAccounts: input.allAccounts,
    accountIds: input.accountIds.map((id) => ObjectId.createFromHexString(id)),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
  await rolesRepo.insertRole(db, role);
  return toPublicRole(role);
}

export async function updateRole(db: Db, roleId: string, input: UpdateRoleInput) {
  const { accountIds, ...rest } = input;
  const patch: Partial<RoleDoc> = { ...rest };
  if (accountIds) {
    patch.accountIds = accountIds.map((id) => ObjectId.createFromHexString(id));
  }
  const updated = await rolesRepo.updateRole(db, roleId, patch);
  if (!updated) throw new ApiError(404, "Role não encontrada");
  return toPublicRole(updated);
}

export async function deleteRole(db: Db, roleId: string) {
  const role = await rolesRepo.findRoleById(db, roleId);
  if (!role) throw new ApiError(404, "Role não encontrada");
  if (role.isDefault) throw new ApiError(422, "A role Administrador não pode ser excluída");
  await rolesRepo.pullRoleFromAllUsers(db, roleId);
  await rolesRepo.deleteRole(db, roleId);
}

export async function reorderRoles(db: Db, input: ReorderRolesInput) {
  await rolesRepo.setPositions(db, input.orderedIds);
  return listRoles(db);
}
