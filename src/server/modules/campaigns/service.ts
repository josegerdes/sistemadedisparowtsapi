import { Db, ObjectId } from "mongodb";

import { CampaignDoc, CampaignRecipientDoc, ContactDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import { collections } from "@/server/db/collections";
import { enqueueJob } from "@/server/jobs/queue";
import * as campaignsRepo from "@/server/modules/campaigns/repository";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import * as templatesRepo from "@/server/modules/templates/repository";
import { CreateCampaignInput } from "@/server/modules/campaigns/types";

export function toPublicCampaign(campaign: CampaignDoc) {
  return {
    id: campaign._id.toHexString(),
    ownerId: campaign.ownerId.toHexString(),
    accountId: campaign.accountId.toHexString(),
    templateId: campaign.templateId.toHexString(),
    name: campaign.name,
    listIds: campaign.listIds.map((id) => id.toHexString()),
    adHocContactIds: campaign.adHocContactIds.map((id) => id.toHexString()),
    variableMapping: campaign.variableMapping,
    scheduledFor: campaign.scheduledFor,
    rateLimitPerMinute: campaign.rateLimitPerMinute,
    status: campaign.status,
    totals: campaign.totals,
    startedAt: campaign.startedAt,
    completedAt: campaign.completedAt,
    createdAt: campaign.createdAt,
  };
}

export async function listCampaigns(db: Db, session: Session) {
  const condition = session.allAccounts
    ? undefined
    : { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) };
  const campaigns = await campaignsRepo.findCampaigns(db, condition);
  return campaigns.map(toPublicCampaign);
}

export async function createCampaign(db: Db, session: Session, input: CreateCampaignInput) {
  const account = await accountsRepo.findAccountById(db, input.accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "oficial") throw new ApiError(422, "Campanhas só podem usar contas Oficiais");

  const template = await templatesRepo.findTemplateById(db, input.templateId);
  if (!template) throw new ApiError(404, "Template não encontrado");
  if (template.accountId.toHexString() !== input.accountId) {
    throw new ApiError(422, "O template não pertence à conta selecionada");
  }

  const now = new Date();
  const campaign: CampaignDoc = {
    _id: new ObjectId(),
    ownerId: ObjectId.createFromHexString(session.userId),
    accountId: account._id,
    templateId: template._id,
    name: input.name,
    listIds: input.listIds.map((id) => ObjectId.createFromHexString(id)),
    adHocContactIds: input.adHocContactIds.map((id) => ObjectId.createFromHexString(id)),
    variableMapping: input.variableMapping,
    scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    rateLimitPerMinute: input.rateLimitPerMinute,
    status: "draft",
    totals: { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await campaignsRepo.insertCampaign(db, campaign);
  return toPublicCampaign(campaign);
}

function resolveVariable(mapping: Record<string, { source: "field" | "literal"; value: string }>, contact: ContactDoc): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, def] of Object.entries(mapping)) {
    if (def.source === "literal") {
      resolved[key] = def.value;
    } else if (def.value === "name") {
      resolved[key] = contact.name ?? "";
    } else if (def.value === "phone") {
      resolved[key] = contact.phone;
    } else {
      resolved[key] = contact.customFields[def.value] ?? "";
    }
  }
  return resolved;
}

/** Materializa os destinatários (união das listas + avulsos, dedupe por telefone, sem opt-out)
 *  e enfileira o job de envio em lote — idempotente: reiniciar uma campanha já iniciada não
 *  duplica destinatários (índice único `(campaignId, contactId)`). */
export async function startCampaign(db: Db, campaignId: string) {
  const campaign = await campaignsRepo.findCampaignById(db, campaignId);
  if (!campaign) throw new ApiError(404, "Campanha não encontrada");
  if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
    throw new ApiError(422, "Esta campanha não pode ser iniciada no status atual");
  }

  const template = await templatesRepo.findTemplateById(db, campaign.templateId.toHexString());
  if (!template) throw new ApiError(404, "Template não encontrado");
  if (template.status !== "approved") {
    throw new ApiError(422, "O template precisa estar aprovado pela Meta antes de iniciar a campanha");
  }

  const contactIds = new Set<string>(campaign.adHocContactIds.map((id) => id.toHexString()));
  if (campaign.listIds.length) {
    const listContacts = await Promise.all(campaign.listIds.map((listId) => collections.contacts(db).find({ listIds: listId, optedOut: false }).toArray()));
    for (const contacts of listContacts) {
      for (const contact of contacts) contactIds.add(contact._id.toHexString());
    }
  }

  const contacts = await collections
    .contacts(db)
    .find({ _id: { $in: Array.from(contactIds).map((id) => ObjectId.createFromHexString(id)) }, optedOut: false })
    .toArray();

  const seenPhones = new Set<string>();
  const now = new Date();
  const recipients: CampaignRecipientDoc[] = [];
  for (const contact of contacts) {
    if (seenPhones.has(contact.phone)) continue;
    seenPhones.add(contact.phone);
    recipients.push({
      _id: new ObjectId(),
      campaignId: campaign._id,
      contactId: contact._id,
      phone: contact.phone,
      resolvedVariables: resolveVariable(campaign.variableMapping, contact),
      status: "queued",
      metaMessageId: null,
      error: null,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!recipients.length) throw new ApiError(422, "Nenhum contato válido encontrado para esta campanha");

  const inserted = await campaignsRepo.insertRecipients(db, recipients);
  const totalQueued = await campaignsRepo.countRecipients(db, campaign._id);

  await campaignsRepo.updateCampaign(db, campaignId, {
    status: "sending",
    startedAt: campaign.startedAt ?? now,
    totals: { ...campaign.totals, queued: totalQueued },
  });

  await enqueueJob(db, "campaign-send-batch", { campaignId }, { runAt: campaign.scheduledFor ?? now });

  return { queued: inserted, totalQueued };
}

export async function pauseCampaign(db: Db, campaignId: string) {
  const campaign = await campaignsRepo.updateCampaign(db, campaignId, { status: "paused" });
  if (!campaign) throw new ApiError(404, "Campanha não encontrada");
  return toPublicCampaign(campaign);
}

export async function cancelCampaign(db: Db, campaignId: string) {
  const campaign = await campaignsRepo.updateCampaign(db, campaignId, { status: "canceled", completedAt: new Date() });
  if (!campaign) throw new ApiError(404, "Campanha não encontrada");
  return toPublicCampaign(campaign);
}

export async function getRecipients(db: Db, campaignId: string, page: number, pageSize: number) {
  const campaignObjectId = ObjectId.createFromHexString(campaignId);
  const [items, total] = await Promise.all([
    campaignsRepo.findRecipientsPaginated(db, campaignObjectId, page, pageSize),
    campaignsRepo.countRecipients(db, campaignObjectId),
  ]);
  return {
    items: items.map((r) => ({
      id: r._id.toHexString(),
      phone: r.phone,
      status: r.status,
      error: r.error,
      sentAt: r.sentAt,
      deliveredAt: r.deliveredAt,
      readAt: r.readAt,
      failedAt: r.failedAt,
    })),
    total,
    page,
    pageSize,
  };
}
