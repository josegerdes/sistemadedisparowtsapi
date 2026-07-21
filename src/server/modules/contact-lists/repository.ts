import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { ContactListDoc } from "@/server/db/schema";

export function findLists(db: Db, ownerId: ObjectId | null) {
  const query = ownerId ? { ownerId } : {};
  return collections.contactLists(db).find(query).sort({ name: 1 }).toArray();
}

export function findListById(db: Db, id: string) {
  return collections.contactLists(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function insertList(db: Db, list: ContactListDoc) {
  return collections.contactLists(db).insertOne(list);
}

export function updateList(db: Db, id: string, patch: Partial<ContactListDoc>) {
  return collections
    .contactLists(db)
    .findOneAndUpdate(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
}

export function deleteList(db: Db, id: string) {
  return collections.contactLists(db).deleteOne({ _id: ObjectId.createFromHexString(id) });
}

export function setContactCount(db: Db, id: ObjectId, count: number) {
  return collections.contactLists(db).updateOne({ _id: id }, { $set: { contactCount: count, updatedAt: new Date() } });
}

export function recountContacts(db: Db, id: ObjectId) {
  return collections.contacts(db).countDocuments({ listIds: id, optedOut: false });
}
