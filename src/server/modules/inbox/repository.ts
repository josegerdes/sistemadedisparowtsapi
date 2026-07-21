import { Db, ObjectId } from "mongodb";

import { collections } from "@/server/db/collections";
import { ChannelType, ConversationDoc, MessageDoc } from "@/server/db/schema";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function upsertConversationOnInbound(
  db: Db,
  params: { accountId: ObjectId; channelType: ChannelType; contactPhone: string; contactName: string | null; preview: string }
): Promise<ConversationDoc> {
  const now = new Date();
  const result = await collections.conversations(db).findOneAndUpdate(
    { accountId: params.accountId, contactPhone: params.contactPhone },
    {
      $set: {
        accountId: params.accountId,
        channelType: params.channelType,
        contactPhone: params.contactPhone,
        contactName: params.contactName,
        lastMessageAt: now,
        lastMessagePreview: params.preview,
        windowExpiresAt: new Date(now.getTime() + WINDOW_MS),
        updatedAt: now,
      },
      $inc: { unreadCount: 1 },
      $setOnInsert: { _id: new ObjectId(), contactId: null, createdAt: now },
    },
    { upsert: true, returnDocument: "after" }
  );
  return result as ConversationDoc;
}

export async function touchConversationOnOutbound(
  db: Db,
  conversationId: ObjectId,
  preview: string
): Promise<void> {
  await collections.conversations(db).updateOne(
    { _id: conversationId },
    { $set: { lastMessageAt: new Date(), lastMessagePreview: preview, unreadCount: 0, updatedAt: new Date() } }
  );
}

export function insertMessage(db: Db, message: MessageDoc) {
  return collections.messages(db).insertOne(message);
}

export function findConversationById(db: Db, id: string) {
  return collections.conversations(db).findOne({ _id: ObjectId.createFromHexString(id) });
}

export function findConversationsByAccountCondition(db: Db, condition?: { $in: ObjectId[] }) {
  const query = condition ? { accountId: condition } : {};
  return collections.conversations(db).find(query).sort({ lastMessageAt: -1 }).toArray();
}

export function findMessagesByConversation(db: Db, conversationId: string) {
  return collections
    .messages(db)
    .find({ conversationId: ObjectId.createFromHexString(conversationId) })
    .sort({ createdAt: 1 })
    .toArray();
}

export function markConversationRead(db: Db, conversationId: string) {
  return collections
    .conversations(db)
    .updateOne({ _id: ObjectId.createFromHexString(conversationId) }, { $set: { unreadCount: 0, updatedAt: new Date() } });
}

export function findMessageByMetaId(db: Db, metaMessageId: string) {
  return collections.messages(db).findOne({ metaMessageId });
}

export function updateMessageStatus(db: Db, metaMessageId: string, status: MessageDoc["status"]) {
  return collections.messages(db).updateOne({ metaMessageId }, { $set: { status } });
}
