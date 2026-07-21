export async function register() {
  // O worker de jobs, o gerenciador do Baileys e o seed só fazem sentido no
  // runtime Node.js (não no Edge, ex: middleware).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startJobWorker } = await import("@/server/jobs/worker");
    startJobWorker();

    // A imagem Docker usa `output: "standalone"` do Next, que não inclui
    // `tsx`/TypeScript nem os arquivos fonte fora do bundle do servidor —
    // `npm run seed` não existe dentro do container publicado. Rodar aqui
    // garante que o admin inicial seja criado sem depender de exec manual.
    const { connectDB } = await import("@/server/db/client");
    const { seedInitialAdmin } = await import("@/server/db/seed-admin");
    try {
      const db = await connectDB();
      await seedInitialAdmin(db);
    } catch (error) {
      console.error("[seed] falha ao rodar o seed inicial no boot:", error);
    }

    // Reconecta as sessões Baileys (canal Não-oficial) persistidas no Mongo.
    try {
      const { startBaileysManager } = await import("@/server/whatsapp/baileys-manager");
      await startBaileysManager();
    } catch (error) {
      console.error("[baileys] falha ao iniciar o manager no boot:", error);
    }

    // Dispara o primeiro ciclo do fallback de sincronização de templates — dali em
    // diante ele se auto-reagenda (ver `template-sync.job.ts`).
    try {
      const { collections } = await import("@/server/db/collections");
      const { enqueueJob } = await import("@/server/jobs/queue");
      const db = await connectDB();
      const alreadyScheduled = await collections
        .jobs(db)
        .findOne({ type: "template-sync", status: { $in: ["pending", "processing"] } });
      if (!alreadyScheduled) {
        await enqueueJob(db, "template-sync", {});
      }
    } catch (error) {
      console.error("[template-sync] falha ao agendar o ciclo inicial:", error);
    }
  }
}
