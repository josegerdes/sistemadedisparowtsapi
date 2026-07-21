import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { TemplateDoc } from "@/server/db/schema";

export function findTemplatesByAccountCondition(db: Db, accountCondition?: { $in: ObjectId[] }) {
  const query = accountCondition ? { accountId: accountCondition } : {};
  return collections.templates(db).find(query).sort({ createdAt: -1 }).toArray();
}

export function findTemplatesByAccount(db: Db, accountId: string) {
  return collections
    .templates(db)
    .find({ accountId: ObjectId.createFromHexString(accountId) })
    .sort({ createdAt: -1 })
    .toArray();
}

export function findTemplateById(db: Db, id: string) {
  return collections.templates(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function findPendingTemplates(db: Db) {
  return collections.templates(db).find({ status: "pending" }).toArray();
}

export function insertTemplate(db: Db, template: TemplateDoc) {
  return collections.templates(db).insertOne(template);
}

export function updateTemplate(db: Db, id: string, patch: Partial<TemplateDoc>) {
  return collections
    .templates(db)
    .findOneAndUpdate(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
}

export function deleteTemplate(db: Db, id: string) {
  return collections.templates(db).deleteOne({ _id: ObjectId.createFromHexString(id) });
}
