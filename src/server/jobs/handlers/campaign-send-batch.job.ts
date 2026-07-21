import { Db } from "mongodb";

import { TemplateDoc } from "@/server/db/schema";
import { enqueueJob } from "@/server/jobs/queue";
import * as campaignsRepo from "@/server/modules/campaigns/repository";
import * as templatesRepo from "@/server/modules/templates/repository";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import { getMetaClient, MetaApiError } from "@/server/whatsapp/meta-client";

// Mesmo valor de `server/jobs/worker.ts` — duplicado aqui de propósito (não importado de lá)
// pra não criar um ciclo de import entre o worker e seus próprios handlers.
const POLL_INTERVAL_MS = 3_000;
const STALE_SENDING_MS = 5 * 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractVariableIndexes(text: string | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
  return matches.map((m) => m.replace(/[{}]/g, ""));
}

/** Reconstrói o array `components` que a Graph API espera pro envio, preenchendo só os
 *  componentes do template que de fato têm variável — Meta rejeita o envio se um
 *  componente sem `{{n}}` no template vier com `parameters` no payload. */
function buildSendComponents(template: TemplateDoc, resolvedVariables: Record<string, string>): Record<string, unknown>[] {
  const components: Record<string, unknown>[] = [];

  for (const component of template.components) {
    if (component.type === "HEADER") {
      const indexes = extractVariableIndexes(component.text);
      if (indexes.length) {
        components.push({
          type: "header",
          parameters: indexes.map((index) => ({ type: "text", text: resolvedVariables[index] ?? "" })),
        });
      }
    }
    if (component.type === "BODY") {
      const indexes = extractVariableIndexes(component.text);
      if (indexes.length) {
        components.push({
          type: "body",
          parameters: indexes.map((index) => ({ type: "text", text: resolvedVariables[index] ?? "" })),
        });
      }
    }
  }

  return components;
}

export async function handleCampaignSendBatchJob(db: Db, payload: Record<string, unknown>): Promise<void> {
  const campaignId = payload.campaignId as string;
  const campaign = await campaignsRepo.findCampaignById(db, campaignId);
  if (!campaign) return;
  if (campaign.status !== "sending") return; // pausada/cancelada — não reagenda

  await campaignsRepo.reclaimStaleSending(db, campaign._id, STALE_SENDING_MS);

  const template = await templatesRepo.findTemplateById(db, campaign.templateId.toHexString());
  const account = await accountsRepo.findAccountByIdRaw(db, campaign.accountId);
  if (!template || !account?.oficial) {
    await campaignsRepo.updateCampaignByObjectId(db, campaign._id, { status: "failed" });
    return;
  }

  const batchSize = Math.max(1, Math.round((campaign.rateLimitPerMinute * (POLL_INTERVAL_MS / 1000)) / 60));
  const spacingMs = Math.max(50, Math.floor(60_000 / campaign.rateLimitPerMinute));

  const claimed = await campaignsRepo.claimQueuedRecipients(db, campaign._id, batchSize);
  const client = await getMetaClient(db, campaign.accountId.toHexString());

  for (let i = 0; i < claimed.length; i++) {
    const recipient = claimed[i];
    if (!recipient) continue;
    try {
      const components = buildSendComponents(template, recipient.resolvedVariables);
      const result = await client.messages.sendTemplate(
        account.oficial.phoneNumberId,
        recipient.phone,
        template.name,
        template.language,
        components
      );
      await campaignsRepo.updateRecipient(db, recipient._id, {
        status: "sent",
        metaMessageId: result.messages[0]?.id ?? null,
        sentAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof MetaApiError ? error.message : "Falha ao enviar mensagem";
      await campaignsRepo.updateRecipient(db, recipient._id, { status: "failed", error: message, failedAt: new Date() });
    }
    if (i < claimed.length - 1) await sleep(spacingMs);
  }

  const counts = await campaignsRepo.countRecipientsByStatus(db, campaign._id);
  const totals = { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 };
  for (const row of counts) {
    if (row._id === "queued" || row._id === "sending") totals.queued += row.count;
    else if (row._id in totals) totals[row._id as keyof typeof totals] += row.count;
  }

  const stillPending = totals.queued > 0;
  await campaignsRepo.updateCampaignByObjectId(db, campaign._id, {
    totals,
    ...(stillPending ? {} : { status: "completed", completedAt: new Date() }),
  });

  if (stillPending) {
    await enqueueJob(db, "campaign-send-batch", { campaignId }, { runAt: new Date(Date.now() + POLL_INTERVAL_MS) });
  }
}
