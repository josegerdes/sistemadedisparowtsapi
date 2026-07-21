import { Db, ObjectId } from "mongodb";

import { ChannelType, ConversationDoc, MessageDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import * as inboxRepo from "@/server/modules/inbox/repository";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import { getMetaClient } from "@/server/whatsapp/meta-client";
import { SendReplyInput } from "@/server/modules/inbox/types";

export interface RecordInboundMessageInput {
  accountId: ObjectId;
  channelType: ChannelType;
  fromPhone: string;
  fromName: string | null;
  body: string;
  metaMessageId: string | null;
}

/**
 * Ponto de entrada compartilhado por AMBOS os canais — o handler do webhook da
 * Meta e o listener `messages.upsert` do Baileys chamam esta mesma função, então
 * a lógica de Inbox (conversa/janela de 24h/não-lidas) fica num só lugar,
 * independente de por onde a mensagem chegou.
 */
export async function recordInboundMessage(db: Db, input: RecordInboundMessageInput): Promise<void> {
  const conversation = await inboxRepo.upsertConversationOnInbound(db, {
    accountId: input.accountId,
    channelType: input.channelType,
    contactPhone: input.fromPhone,
    contactName: input.fromName,
    preview: input.body.slice(0, 140),
  });

  const message: MessageDoc = {
    _id: new ObjectId(),
    conversationId: conversation._id,
    accountId: input.accountId,
    direction: "inbound",
    channelType: input.channelType,
    body: input.body,
    mediaUrl: null,
    mediaType: null,
    metaMessageId: input.metaMessageId,
    status: "received",
    error: null,
    sentByUserId: null,
    createdAt: new Date(),
  };
  await inboxRepo.insertMessage(db, message);
}

export function toPublicConversation(conversation: ConversationDoc) {
  return {
    id: conversation._id.toHexString(),
    accountId: conversation.accountId.toHexString(),
    channelType: conversation.channelType,
    contactPhone: conversation.contactPhone,
    contactName: conversation.contactName,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount: conversation.unreadCount,
    windowExpiresAt: conversation.windowExpiresAt,
  };
}

export function toPublicMessage(message: MessageDoc) {
  return {
    id: message._id.toHexString(),
    direction: message.direction,
    channelType: message.channelType,
    body: message.body,
    status: message.status,
    error: message.error,
    createdAt: message.createdAt,
  };
}

export async function listConversations(db: Db, session: Session) {
  const condition = session.allAccounts
    ? undefined
    : { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) };
  const conversations = await inboxRepo.findConversationsByAccountCondition(db, condition);
  return conversations.map(toPublicConversation);
}

export async function getMessages(db: Db, conversationId: string) {
  const messages = await inboxRepo.findMessagesByConversation(db, conversationId);
  await inboxRepo.markConversationRead(db, conversationId);
  return messages.map(toPublicMessage);
}

/** Envia uma resposta manual roteando pro canal certo — Oficial só dentro da janela de 24h de
 *  atendimento ao cliente (regra da própria Meta pra mensagem de texto livre, fora de template). */
export async function sendReply(db: Db, session: Session, conversationId: string, input: SendReplyInput) {
  const conversation = await inboxRepo.findConversationById(db, conversationId);
  if (!conversation) throw new ApiError(404, "Conversa não encontrada");

  const account = await accountsRepo.findAccountByIdRaw(db, conversation.accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");

  let metaMessageId: string | null = null;

  if (conversation.channelType === "oficial") {
    if (!conversation.windowExpiresAt || conversation.windowExpiresAt.getTime() < Date.now()) {
      throw new ApiError(422, "A janela de 24h de atendimento ao cliente expirou — não é possível enviar mensagem livre. Use uma campanha com template aprovado.");
    }
    if (!account.oficial) throw new ApiError(422, "Conta Oficial mal configurada");
    const client = await getMetaClient(db, conversation.accountId.toHexString());
    const result = await client.messages.sendText(account.oficial.phoneNumberId, conversation.contactPhone, input.body);
    metaMessageId = result.messages[0]?.id ?? null;
  } else {
    const { sendBaileysText } = await import("@/server/whatsapp/baileys-manager");
    await sendBaileysText(conversation.accountId.toHexString(), conversation.contactPhone, input.body);
  }

  const message: MessageDoc = {
    _id: new ObjectId(),
    conversationId: conversation._id,
    accountId: conversation.accountId,
    direction: "outbound",
    channelType: conversation.channelType,
    body: input.body,
    mediaUrl: null,
    mediaType: null,
    metaMessageId,
    status: "sent",
    error: null,
    sentByUserId: ObjectId.createFromHexString(session.userId),
    createdAt: new Date(),
  };
  await inboxRepo.insertMessage(db, message);
  await inboxRepo.touchConversationOnOutbound(db, conversation._id, input.body.slice(0, 140));
  return toPublicMessage(message);
}
