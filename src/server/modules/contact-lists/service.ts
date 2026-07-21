import { Db, ObjectId } from "mongodb";

import { ContactListDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import * as listsRepo from "@/server/modules/contact-lists/repository";
import { CreateListInput, UpdateListInput } from "@/server/modules/contact-lists/types";

export function toPublicList(list: ContactListDoc) {
  return {
    id: list._id.toHexString(),
    ownerId: list.ownerId.toHexString(),
    name: list.name,
    description: list.description,
    contactCount: list.contactCount,
    createdAt: list.createdAt,
  };
}

/** Listas são escopadas por dono (sem extensão via role, diferente de Contas WhatsApp) —
 *  só o Administrador (isSuperAdmin) enxerga listas de outros usuários. */
export async function listLists(db: Db, session: Session) {
  const ownerId = session.isSuperAdmin ? null : ObjectId.createFromHexString(session.userId);
  const lists = await listsRepo.findLists(db, ownerId);
  return lists.map(toPublicList);
}

export async function createList(db: Db, session: Session, input: CreateListInput) {
  const now = new Date();
  const list: ContactListDoc = {
    _id: new ObjectId(),
    ownerId: ObjectId.createFromHexString(session.userId),
    name: input.name,
    description: input.description ?? null,
    contactCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await listsRepo.insertList(db, list);
  return toPublicList(list);
}

async function assertOwnership(db: Db, session: Session, listId: string): Promise<ContactListDoc> {
  const list = await listsRepo.findListById(db, listId);
  if (!list) throw new ApiError(404, "Lista não encontrada");
  if (!session.isSuperAdmin && list.ownerId.toHexString() !== session.userId) {
    throw new ApiError(403, "Você não tem acesso a esta lista");
  }
  return list;
}

export async function updateList(db: Db, session: Session, listId: string, input: UpdateListInput) {
  await assertOwnership(db, session, listId);
  const updated = await listsRepo.updateList(db, listId, input);
  if (!updated) throw new ApiError(404, "Lista não encontrada");
  return toPublicList(updated);
}

export async function deleteList(db: Db, session: Session, listId: string): Promise<void> {
  await assertOwnership(db, session, listId);
  await listsRepo.deleteList(db, listId);
}

export async function refreshContactCount(db: Db, listId: ObjectId): Promise<void> {
  const count = await listsRepo.recountContacts(db, listId);
  await listsRepo.setContactCount(db, listId, count);
}

export { assertOwnership as assertListOwnership };
