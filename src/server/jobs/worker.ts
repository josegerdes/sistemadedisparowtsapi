import { connectDB } from "@/server/db/client";
import { claimNextJob, completeJob, failJob } from "@/server/jobs/queue";
import { handleMetaWebhookJob } from "@/server/jobs/handlers/meta-webhook.job";
import { handleTemplateSyncJob } from "@/server/jobs/handlers/template-sync.job";
import { handleCampaignSendBatchJob } from "@/server/jobs/handlers/campaign-send-batch.job";

const POLL_INTERVAL_MS = 3_000;

type JobHandler = (db: Awaited<ReturnType<typeof connectDB>>, payload: Record<string, unknown>) => Promise<void>;

const HANDLERS: Record<string, JobHandler> = {
  "meta-webhook": handleMetaWebhookJob,
  "template-sync": handleTemplateSyncJob,
  "campaign-send-batch": handleCampaignSendBatchJob,
};

async function processOnce() {
  const db = await connectDB();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await claimNextJob(db);
    if (!job) break;

    const handler = HANDLERS[job.type];
    try {
      if (!handler) throw new Error(`Nenhum handler registrado para o job "${job.type}"`);
      await handler(db, job.payload);
      await completeJob(db, job._id);
    } catch (error) {
      console.error(`[jobs] falha ao processar job ${job.type} (${job._id.toHexString()})`, error);
      const err = error instanceof Error ? error : new Error(String(error));
      await failJob(db, job, err);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __jobWorkerStarted: boolean | undefined;
}

/** Inicia o loop de processamento de jobs uma única vez por processo (chamado em `instrumentation.ts`). */
export function startJobWorker() {
  if (global.__jobWorkerStarted) return;
  global.__jobWorkerStarted = true;

  setInterval(() => {
    processOnce().catch((error) => console.error("[jobs] erro no loop de processamento", error));
  }, POLL_INTERVAL_MS);

  console.log("[jobs] worker iniciado");
}
