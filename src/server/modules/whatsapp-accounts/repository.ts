import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { WhatsappAccountDoc } from "@/server/db/schema";

export function findAccountsByCondition(db: Db, condition?: { $in: ObjectId[] }) {
  const query = condition ? { _id: condition } : {};
  return collections.whatsappAccounts(db).find(query).sort({ name: 1 }).toArray();
}

export function findAccountById(db: Db, id: string) {
  return collections.whatsappAccounts(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function findAccountByIdRaw(db: Db, id: ObjectId) {
  return collections.whatsappAccounts(db).findOne({ _id: id });
}

export function findNaoOficialAccounts(db: Db) {
  return collections.whatsappAccounts(db).find({ type: "nao_oficial" }).toArray();
}

export function findAccountByPhoneNumberId(db: Db, phoneNumberId: string) {
  return collections.whatsappAccounts(db).findOne({ "oficial.phoneNumberId": phoneNumberId });
}

export function findAccountByWabaId(db: Db, wabaId: string) {
  return collections.whatsappAccounts(db).findOne({ "oficial.wabaId": wabaId });
}

export function insertAccount(db: Db, account: WhatsappAccountDoc) {
  return collections.whatsappAccounts(db).insertOne(account);
}

export function updateAccount(db: Db, id: string, patch: Partial<WhatsappAccountDoc>) {
  return collections
    .whatsappAccounts(db)
    .findOneAndUpdate(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
}

export function updateAccountByObjectId(db: Db, id: ObjectId, patch: Partial<WhatsappAccountDoc>) {
  return collections.whatsappAccounts(db).updateOne({ _id: id }, { $set: { ...patch, updatedAt: new Date() } });
}

export function deleteAccount(db: Db, id: string) {
  return collections.whatsappAccounts(db).deleteOne({ _id: ObjectId.createFromHexString(id) });
}
