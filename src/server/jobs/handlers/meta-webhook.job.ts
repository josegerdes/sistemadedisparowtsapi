import { Db } from "mongodb";

import { collections } from "@/server/db/collections";
import { TemplateStatus } from "@/server/db/schema";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import * as inboxRepo from "@/server/modules/inbox/repository";
import { recordInboundMessage } from "@/server/modules/inbox/service";

interface MetaWebhookValue {
  metadata?: { phone_number_id?: string };
  messages?: { from: string; id: string; type: string; text?: { body?: string }; timestamp: string }[];
  statuses?: { id: string; status: string; recipient_id: string }[];
}

interface MetaWebhookChange {
  field: string;
  value: MetaWebhookValue & { message_template_id?: string; event?: string; reason?: string };
}

interface MetaWebhookEntry {
  id: string; // waba id
  changes: MetaWebhookChange[];
}

interface MetaWebhookPayload {
  entry?: MetaWebhookEntry[];
}

const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

export async function handleMetaWebhookJob(db: Db, payload: Record<string, unknown>): Promise<void> {
  const body = payload as MetaWebhookPayload;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "messages") {
        await handleMessagesChange(db, change.value);
      } else if (change.field === "message_template_status_update") {
        await handleTemplateStatusChange(db, change.value);
      }
    }
  }
}

async function handleMessagesChange(db: Db, value: MetaWebhookValue): Promise<void> {
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) return;
  const account = await accountsRepo.findAccountByPhoneNumberId(db, phoneNumberId);
  if (!account) {
    console.warn("[meta-webhook] nenhuma conta encontrada para phone_number_id", phoneNumberId);
    return;
  }

  for (const message of value.messages ?? []) {
    if (message.type !== "text" || !message.text?.body) continue;
    await recordInboundMessage(db, {
      accountId: account._id,
      channelType: "oficial",
      fromPhone: message.from,
      fromName: null,
      body: message.text.body,
      metaMessageId: message.id,
    });
  }

  for (const status of value.statuses ?? []) {
    const mapped = STATUS_MAP[status.status];
    if (!mapped) continue;
    await inboxRepo.updateMessageStatus(db, status.id, mapped);
    await collections.campaignRecipients(db).updateOne(
      { metaMessageId: status.id },
      {
        $set: {
          status: mapped,
          updatedAt: new Date(),
          ...(mapped === "sent" ? { sentAt: new Date() } : {}),
          ...(mapped === "delivered" ? { deliveredAt: new Date() } : {}),
          ...(mapped === "read" ? { readAt: new Date() } : {}),
          ...(mapped === "failed" ? { failedAt: new Date() } : {}),
        },
      }
    );
  }
}

async function handleTemplateStatusChange(
  db: Db,
  value: { message_template_id?: string; event?: string; reason?: string }
): Promise<void> {
  if (!value.message_template_id || !value.event) return;
  const eventStatus = value.event.toLowerCase();
  const validStatuses: TemplateStatus[] = ["approved", "rejected", "paused", "disabled", "pending"];
  const status = validStatuses.find((s) => s === eventStatus);
  if (!status) return;

  await collections.templates(db).updateOne(
    { metaTemplateId: value.message_template_id },
    {
      $set: {
        status,
        rejectedReason: status === "rejected" ? (value.reason ?? null) : null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}
