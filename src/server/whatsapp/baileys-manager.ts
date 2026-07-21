import { Db, ObjectId } from "mongodb";
import makeWASocket, { Browsers, DisconnectReason, WASocket } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { Boom } from "@hapi/boom";

import { connectDB } from "@/server/db/client";
import { collections } from "@/server/db/collections";
import { getMongoAuthState, clearMongoAuthState } from "@/server/whatsapp/baileys-mongo-auth-state";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import { recordInboundMessage } from "@/server/modules/inbox/service";

interface ManagedSocket {
  socket: WASocket;
  lastQrDataUrl: string | null;
}

type BaileysCache = {
  sockets: Map<string, ManagedSocket>;
  reconnectAttempts: Map<string, number>;
};

declare global {
  // eslint-disable-next-line no-var
  var __baileysCache: BaileysCache | undefined;
  // eslint-disable-next-line no-var
  var __baileysManagerStarted: boolean | undefined;
}

const cache: BaileysCache = global.__baileysCache ?? { sockets: new Map(), reconnectAttempts: new Map() };
global.__baileysCache = cache;

function maxBackoffMs(): number {
  return Number(process.env.BAILEYS_RECONNECT_MAX_BACKOFF_MS ?? 60_000);
}

/** Extrai texto de um evento `messages.upsert` do Baileys, ignorando tipos sem texto (v1: só texto). */
function extractText(message: unknown): string | null {
  const msg = message as { conversation?: string; extendedTextMessage?: { text?: string } } | undefined;
  return msg?.conversation ?? msg?.extendedTextMessage?.text ?? null;
}

export async function connectAccount(db: Db, accountId: string): Promise<void> {
  const existing = cache.sockets.get(accountId);
  if (existing) return;

  const { state, saveCreds } = await getMongoAuthState(db, accountId);

  const socket = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Disparo WhatsApp"),
    printQRInTerminal: false,
  });

  cache.sockets.set(accountId, { socket, lastQrDataUrl: null });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const managed = cache.sockets.get(accountId);
    const { connection, lastDisconnect, qr } = update;
    const db2 = await connectDB();

    if (qr && managed) {
      managed.lastQrDataUrl = await QRCode.toDataURL(qr);
      await accountsRepo.updateAccount(db2, accountId, {
        status: "pending",
        statusMessage: "Aguardando leitura do QR Code",
        naoOficial: {
          connectedNumber: null,
          lastQrAt: new Date(),
          lastConnectedAt: null,
          lastDisconnectReason: null,
        },
      });
    }

    if (connection === "open") {
      cache.reconnectAttempts.delete(accountId);
      const number = socket.user?.id?.split(":")[0] ?? null;
      const account = await accountsRepo.findAccountById(db2, accountId);
      await accountsRepo.updateAccount(db2, accountId, {
        status: "connected",
        statusMessage: null,
        naoOficial: {
          connectedNumber: number,
          lastQrAt: account?.naoOficial?.lastQrAt ?? null,
          lastConnectedAt: new Date(),
          lastDisconnectReason: null,
        },
      });
    }

    if (connection === "close") {
      cache.sockets.delete(accountId);
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        await clearMongoAuthState(db2, accountId);
        await accountsRepo.updateAccount(db2, accountId, {
          status: "disconnected",
          statusMessage: "Sessão encerrada — leia um novo QR Code para reconectar",
          naoOficial: { connectedNumber: null, lastQrAt: null, lastConnectedAt: null, lastDisconnectReason: "logged_out" },
        });
        return;
      }

      const account = await accountsRepo.findAccountById(db2, accountId);
      await accountsRepo.updateAccount(db2, accountId, {
        status: "error",
        statusMessage: "Conexão perdida — tentando reconectar",
        naoOficial: {
          connectedNumber: account?.naoOficial?.connectedNumber ?? null,
          lastQrAt: account?.naoOficial?.lastQrAt ?? null,
          lastConnectedAt: account?.naoOficial?.lastConnectedAt ?? null,
          lastDisconnectReason: String(statusCode ?? "unknown"),
        },
      });

      const attempts = (cache.reconnectAttempts.get(accountId) ?? 0) + 1;
      cache.reconnectAttempts.set(accountId, attempts);
      const backoff = Math.min(2 ** attempts * 1000, maxBackoffMs());
      setTimeout(() => {
        connectAccount(db2, accountId).catch((error) => console.error("[baileys] falha ao reconectar", accountId, error));
      }, backoff);
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const db3 = await connectDB();
    for (const message of messages) {
      if (message.key.fromMe) continue;
      const text = extractText(message.message);
      if (!text) continue;
      const fromPhone = message.key.remoteJid?.split("@")[0];
      if (!fromPhone) continue;
      await recordInboundMessage(db3, {
        accountId: ObjectId.createFromHexString(accountId),
        channelType: "nao_oficial",
        fromPhone,
        fromName: message.pushName ?? null,
        body: text,
        metaMessageId: null,
      });
    }
  });
}

/** Envia uma mensagem de texto avulsa pelo socket já conectado — usado pela Inbox (resposta manual
 *  no canal Não-oficial, sem restrição de janela de 24h, mas sem garantia de entrega oficial). */
export async function sendBaileysText(accountId: string, phone: string, body: string): Promise<void> {
  const managed = cache.sockets.get(accountId);
  if (!managed) throw new Error("Esta conta não está conectada no momento");
  await managed.socket.sendMessage(`${phone}@s.whatsapp.net`, { text: body });
}

export async function disconnectAccount(db: Db, accountId: string): Promise<void> {
  const managed = cache.sockets.get(accountId);
  if (managed) {
    await managed.socket.logout().catch(() => undefined);
    cache.sockets.delete(accountId);
  }
  await clearMongoAuthState(db, accountId);
  await accountsRepo.updateAccount(db, accountId, {
    status: "disconnected",
    statusMessage: null,
    naoOficial: { connectedNumber: null, lastQrAt: null, lastConnectedAt: null, lastDisconnectReason: "manual" },
  });
}

export function getQrDataUrl(accountId: string): string | null {
  return cache.sockets.get(accountId)?.lastQrDataUrl ?? null;
}

/** Reconecta, no boot do processo, toda conta Não-oficial cuja sessão foi persistida
 *  (não desconectada manualmente) — mesma filosofia idempotente do `seedInitialAdmin`. */
export async function startBaileysManager(): Promise<void> {
  if (global.__baileysManagerStarted) return;
  global.__baileysManagerStarted = true;

  const db = await connectDB();
  const accounts = await accountsRepo.findNaoOficialAccounts(db);
  for (const account of accounts) {
    if (account.status === "disconnected" && !account.naoOficial?.connectedNumber) continue;
    connectAccount(db, account._id.toHexString()).catch((error) =>
      console.error("[baileys] falha ao reconectar no boot", account._id.toHexString(), error)
    );
  }

  console.log(`[baileys] manager iniciado (${accounts.length} conta(s) não-oficial verificada(s))`);
}
