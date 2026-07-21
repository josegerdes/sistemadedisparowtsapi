import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { CampaignDoc, CampaignRecipientDoc, CampaignRecipientStatus } from "@/server/db/schema";

export function findCampaigns(db: Db, accountCondition?: { $in: ObjectId[] }) {
  const query = accountCondition ? { accountId: accountCondition } : {};
  return collections.campaigns(db).find(query).sort({ createdAt: -1 }).toArray();
}

export function findCampaignById(db: Db, id: string) {
  return collections.campaigns(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function insertCampaign(db: Db, campaign: CampaignDoc) {
  return collections.campaigns(db).insertOne(campaign);
}

export function updateCampaign(db: Db, id: string, patch: Partial<CampaignDoc>) {
  return collections
    .campaigns(db)
    .findOneAndUpdate(
      { _id: ObjectId.createFromHexString(id) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
}

export function updateCampaignByObjectId(db: Db, id: ObjectId, patch: Partial<CampaignDoc>) {
  return collections.campaigns(db).updateOne({ _id: id }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function insertRecipients(db: Db, recipients: CampaignRecipientDoc[]): Promise<number> {
  if (!recipients.length) return 0;
  try {
    const result = await collections.campaignRecipients(db).insertMany(recipients, { ordered: false });
    return result.insertedCount;
  } catch (error) {
    // Índice único (campaignId, contactId) rejeita duplicatas de uma re-materialização —
    // esperado se `startCampaign` for chamado mais de uma vez; conta só os que entraram.
    const bulkError = error as { result?: { insertedCount?: number } };
    return bulkError.result?.insertedCount ?? 0;
  }
}

export function countRecipientsByStatus(db: Db, campaignId: ObjectId) {
  return collections
    .campaignRecipients(db)
    .aggregate<{ _id: CampaignRecipientStatus; count: number }>([
      { $match: { campaignId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])
    .toArray();
}

export function findRecipientsPaginated(db: Db, campaignId: ObjectId, page: number, pageSize: number) {
  return collections
    .campaignRecipients(db)
    .find({ campaignId })
    .sort({ createdAt: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
}

export function countRecipients(db: Db, campaignId: ObjectId) {
  return collections.campaignRecipients(db).countDocuments({ campaignId });
}

/** Reclama atomicamente até `batchSize` destinatários "queued" — evita corrida entre
 *  execuções concorrentes do mesmo job de envio. */
export async function claimQueuedRecipients(db: Db, campaignId: ObjectId, batchSize: number): Promise<CampaignRecipientDoc[]> {
  const claimed: CampaignRecipientDoc[] = [];
  for (let i = 0; i < batchSize; i++) {
    const result = await collections.campaignRecipients(db).findOneAndUpdate(
      { campaignId, status: "queued" },
      { $set: { status: "sending", updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) break;
    claimed.push(result);
  }
  return claimed;
}

/** Auto-recuperação: destinatários presos em "sending" há mais de N minutos (ex: o processo
 *  morreu no meio do envio) voltam pra "queued" pra não ficarem perdidos pra sempre. */
export function reclaimStaleSending(db: Db, campaignId: ObjectId, olderThanMs: number) {
  return collections.campaignRecipients(db).updateMany(
    { campaignId, status: "sending", updatedAt: { $lt: new Date(Date.now() - olderThanMs) } },
    { $set: { status: "queued", updatedAt: new Date() } }
  );
}

export function updateRecipient(db: Db, id: ObjectId, patch: Partial<CampaignRecipientDoc>) {
  return collections.campaignRecipients(db).updateOne({ _id: id }, { $set: { ...patch, updatedAt: new Date() } });
}
