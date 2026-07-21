import { Db, MongoClient } from "mongodb";

type MongoCache = {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
  indexesEnsured: boolean;
};

// eslint-disable-next-line no-var
declare global {
  var __mongoCache: MongoCache | undefined;
}

const cache: MongoCache = global.__mongoCache ?? { client: null, promise: null, indexesEnsured: false };
global.__mongoCache = cache;

/**
 * Índices pros filtros mais comuns (dono/conta, correlação de webhook por wamid/wabaId,
 * chaves de sessão do Baileys). Únicos onde a correção depende disso (ex: destinatário de
 * campanha não pode duplicar, chave de sessão do Baileys é 1:1) — diferente do projeto de
 * referência, aqui são coleções novas que o sistema controla desde o dia 1.
 * Roda uma vez por processo; idempotente; falha aqui nunca derruba a aplicação.
 */
async function ensureIndexes(db: Db): Promise<void> {
  if (cache.indexesEnsured) return;
  cache.indexesEnsured = true;

  try {
    await Promise.all([
      db.collection("whatsappAccounts").createIndex({ ownerId: 1 }),
      db.collection("contacts").createIndex({ ownerId: 1 }),
      db.collection("contacts").createIndex({ ownerId: 1, phone: 1 }),
      db.collection("contactLists").createIndex({ ownerId: 1 }),
      db.collection("templates").createIndex({ accountId: 1 }),
      db.collection("templates").createIndex({ metaTemplateId: 1 }),
      db.collection("campaigns").createIndex({ ownerId: 1 }),
      db.collection("campaigns").createIndex({ accountId: 1 }),
      db.collection("campaignRecipients").createIndex({ campaignId: 1, contactId: 1 }, { unique: true }),
      db.collection("campaignRecipients").createIndex({ metaMessageId: 1 }),
      db.collection("conversations").createIndex({ accountId: 1 }),
      db.collection("conversations").createIndex({ accountId: 1, contactPhone: 1 }, { unique: true }),
      db.collection("messages").createIndex({ conversationId: 1 }),
      db.collection("messages").createIndex({ metaMessageId: 1 }),
      db.collection("jobs").createIndex({ status: 1, runAt: 1 }),
      db.collection("baileysAuthKeys").createIndex({ accountId: 1, keyType: 1, keyId: 1 }, { unique: true }),
    ]);
  } catch (error) {
    console.error("Falha ao criar índices do Mongo (não bloqueia a aplicação):", error);
  }
}

// Lida lazy (não no module scope) para não quebrar o build do Next, que
// carrega os route handlers para coletar metadados antes de qualquer
// variável de ambiente de runtime estar disponível (ex: build do Docker).
async function getClient(): Promise<MongoClient> {
  if (cache.client) return cache.client;
  if (!cache.promise) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("Defina a variável de ambiente DATABASE_URL (.env)");
    }
    cache.promise = new MongoClient(databaseUrl).connect();
  }
  cache.client = await cache.promise;
  return cache.client;
}

export async function connectDB(dbName: string = process.env.DB ?? "disparo_whatsapp"): Promise<Db> {
  const client = await getClient();
  const db = client.db(dbName);
  void ensureIndexes(db);
  return db;
}

export default connectDB;
