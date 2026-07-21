import { Db } from "mongodb";

import { enqueueJob } from "@/server/jobs/queue";
import * as templatesRepo from "@/server/modules/templates/repository";
import * as templatesService from "@/server/modules/templates/service";

const SYNC_INTERVAL_MS = 30 * 60_000;

/**
 * Fallback de baixa frequência — o caminho principal de status de template é o
 * webhook `message_template_status_update` (evento push), que costuma chegar em
 * segundos. Isso aqui só existe pra pegar o caso raro de webhook perdido/atrasado,
 * então varre só templates ainda "pending" e se auto-reagenda pro próximo ciclo.
 */
export async function handleTemplateSyncJob(db: Db): Promise<void> {
  const pending = await templatesRepo.findPendingTemplates(db);

  for (const template of pending) {
    try {
      await templatesService.syncTemplateStatus(db, template._id.toHexString());
    } catch (error) {
      console.error("[template-sync] falha ao sincronizar template", template._id.toHexString(), error);
    }
  }

  await enqueueJob(db, "template-sync", {}, { runAt: new Date(Date.now() + SYNC_INTERVAL_MS) });
}
