import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { ContactDoc } from "@/server/db/schema";

export function findContacts(db: Db, ownerId: ObjectId | null, listId?: ObjectId) {
  const query: Record<string, unknown> = {};
  if (ownerId) query.ownerId = ownerId;
  if (listId) query.listIds = listId;
  return collections.contacts(db).find(query).sort({ name: 1, phone: 1 }).toArray();
}

export function findContactById(db: Db, id: string) {
  return collections.contacts(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function findContactByPhone(db: Db, ownerId: ObjectId, phone: string) {
  return collections.contacts(db).findOne({ ownerId, phone });
}

export function findContactsByIds(db: Db, ids: ObjectId[]) {
  return collections.contacts(db).find({ _id: { $in: ids } }).toArray();
}

export function findContactsByListId(db: Db, listId: ObjectId) {
  return collections.contacts(db).find({ listIds: listId, optedOut: false }).toArray();
}

export function insertContact(db: Db, contact: ContactDoc) {
  return collections.contacts(db).insertOne(contact);
}

export function updateContact(db: Db, id: string, patch: Partial<ContactDoc>) {
  return collections
    .contacts(db)
    .findOneAndUpdate(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
}

export function deleteContact(db: Db, id: string) {
  return collections.contacts(db).deleteOne({ _id: ObjectId.createFromHexString(id) });
}

export function addContactToList(db: Db, contactId: ObjectId, listId: ObjectId) {
  return collections
    .contacts(db)
    .updateOne({ _id: contactId }, { $addToSet: { listIds: listId }, $set: { updatedAt: new Date() } });
}

export function removeContactFromList(db: Db, contactId: ObjectId, listId: ObjectId) {
  return collections
    .contacts(db)
    .updateOne({ _id: contactId }, { $pull: { listIds: listId }, $set: { updatedAt: new Date() } });
}

export async function upsertByPhone(
  db: Db,
  ownerId: ObjectId,
  phone: string,
  patch: { name: string | null; customFields: Record<string, string>; listId: ObjectId }
): Promise<{ isNew: boolean }> {
  const now = new Date();
  const result = await collections.contacts(db).findOneAndUpdate(
    { ownerId, phone },
    {
      $set: { name: patch.name, updatedAt: now },
      $addToSet: { listIds: patch.listId },
      $setOnInsert: {
        _id: new ObjectId(),
        ownerId,
        phone,
        tags: [],
        optedOut: false,
        optedOutAt: null,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const isNew = result?.createdAt.getTime() === now.getTime();
  if (Object.keys(patch.customFields).length) {
    await collections.contacts(db).updateOne(
      { ownerId, phone },
      { $set: Object.fromEntries(Object.entries(patch.customFields).map(([k, v]) => [`customFields.${k}`, v])) }
    );
  }
  return { isNew };
}
