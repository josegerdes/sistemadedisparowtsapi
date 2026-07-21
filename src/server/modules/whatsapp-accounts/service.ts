import { Db, ObjectId } from "mongodb";

import { WhatsappAccountDoc, WhatsappAccountTier } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import { encryptSecret, maskSecret, decryptSecret } from "@/server/crypto/secrets";
import { getMetaClient, MetaApiError } from "@/server/whatsapp/meta-client";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import { CreateAccountInput, UpdateAccountInput } from "@/server/modules/whatsapp-accounts/types";

export function toPublicAccount(account: WhatsappAccountDoc) {
  return {
    id: account._id.toHexString(),
    ownerId: account.ownerId.toHexString(),
    name: account.name,
    type: account.type,
    status: account.status,
    statusMessage: account.statusMessage,
    oficial: account.oficial
      ? {
          accessTokenMasked: maskSecret(decryptSecret(account.oficial.accessTokenEnc)),
          phoneNumberId: account.oficial.phoneNumberId,
          wabaId: account.oficial.wabaId,
          businessAccountId: account.oficial.businessAccountId,
          displayPhoneNumber: account.oficial.displayPhoneNumber,
          tier: account.oficial.tier,
          lastVerifiedAt: account.oficial.lastVerifiedAt,
        }
      : null,
    naoOficial: account.naoOficial,
    createdAt: account.createdAt,
  };
}

export async function listAccounts(db: Db, session: Session) {
  const condition = session.allAccounts
    ? undefined
    : { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) };
  const accounts = await accountsRepo.findAccountsByCondition(db, condition);
  return accounts.map(toPublicAccount);
}

export async function createAccount(db: Db, session: Session, input: CreateAccountInput) {
  const now = new Date();

  let oficial: WhatsappAccountDoc["oficial"] = null;
  if (input.type === "oficial") {
    if (!input.oficial) throw new ApiError(422, "Informe os dados de conexão da conta Oficial");
    oficial = {
      accessTokenEnc: encryptSecret(input.oficial.accessToken),
      phoneNumberId: input.oficial.phoneNumberId,
      wabaId: input.oficial.wabaId,
      businessAccountId: input.oficial.businessAccountId,
      displayPhoneNumber: null,
      tier: "UNKNOWN",
      lastVerifiedAt: null,
    };
  }

  const account: WhatsappAccountDoc = {
    _id: new ObjectId(),
    ownerId: ObjectId.createFromHexString(session.userId),
    name: input.name,
    type: input.type,
    status: input.type === "oficial" ? "pending" : "disconnected",
    statusMessage: null,
    oficial,
    naoOficial:
      input.type === "nao_oficial"
        ? { connectedNumber: null, lastQrAt: null, lastConnectedAt: null, lastDisconnectReason: null }
        : null,
    createdAt: now,
    updatedAt: now,
  };
  await accountsRepo.insertAccount(db, account);
  return toPublicAccount(account);
}

export async function updateAccount(db: Db, accountId: string, input: UpdateAccountInput) {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");

  const patch: Partial<WhatsappAccountDoc> = {};
  if (input.name) patch.name = input.name;
  if (input.oficial) {
    if (account.type !== "oficial" || !account.oficial) {
      throw new ApiError(422, "Esta conta não é do tipo Oficial");
    }
    patch.oficial = {
      ...account.oficial,
      ...(input.oficial.accessToken ? { accessTokenEnc: encryptSecret(input.oficial.accessToken) } : {}),
      ...(input.oficial.phoneNumberId ? { phoneNumberId: input.oficial.phoneNumberId } : {}),
      ...(input.oficial.wabaId ? { wabaId: input.oficial.wabaId } : {}),
      ...(input.oficial.businessAccountId ? { businessAccountId: input.oficial.businessAccountId } : {}),
    };
  }

  const updated = await accountsRepo.updateAccount(db, accountId, patch);
  if (!updated) throw new ApiError(404, "Conta WhatsApp não encontrada");
  return toPublicAccount(updated);
}

export async function deleteAccount(db: Db, accountId: string): Promise<void> {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type === "nao_oficial") {
    const { disconnectAccount } = await import("@/server/whatsapp/baileys-manager");
    await disconnectAccount(db, accountId).catch(() => undefined);
  }
  await accountsRepo.deleteAccount(db, accountId);
}

/** Valida o token/ids informados chamando a Graph API de verdade — usado antes de
 *  liberar a conta pra criação de templates/campanhas. */
export async function verifyOficialCredentials(db: Db, accountId: string) {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "oficial" || !account.oficial) {
    throw new ApiError(422, "Esta conta não é do tipo Oficial");
  }

  const client = await getMetaClient(db, accountId);
  try {
    const info = await client.phoneNumbers.get(account.oficial.phoneNumberId);
    const knownTiers: WhatsappAccountTier[] = ["TIER_250", "TIER_1K", "TIER_10K", "TIER_100K"];
    const tier = knownTiers.find((t) => t === info.messaging_limit_tier) ?? "UNKNOWN";
    const updated = await accountsRepo.updateAccount(db, accountId, {
      status: "connected",
      statusMessage: null,
      oficial: {
        ...account.oficial,
        displayPhoneNumber: info.display_phone_number,
        tier,
        lastVerifiedAt: new Date(),
      },
    });
    return toPublicAccount(updated!);
  } catch (error) {
    await accountsRepo.updateAccount(db, accountId, {
      status: "error",
      statusMessage: error instanceof MetaApiError ? error.message : "Falha ao verificar credenciais",
    });
    throw error;
  }
}

/** Inscreve o app configurado (`META_APP_ID`) pra receber webhooks dessa WABA — precisa
 *  ser feito uma vez por conta antes dos eventos de mensagem/status começarem a chegar. */
export async function subscribeOficialWebhook(db: Db, accountId: string): Promise<void> {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "oficial" || !account.oficial) {
    throw new ApiError(422, "Esta conta não é do tipo Oficial");
  }
  const client = await getMetaClient(db, accountId);
  await client.subscribedApps.subscribe(account.oficial.wabaId);
}

export async function startNaoOficialPairing(db: Db, accountId: string): Promise<void> {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "nao_oficial") {
    throw new ApiError(422, "Esta conta não é do tipo Não-oficial");
  }
  const { connectAccount } = await import("@/server/whatsapp/baileys-manager");
  await connectAccount(db, accountId);
}

export async function getNaoOficialQr(accountId: string): Promise<string | null> {
  const { getQrDataUrl } = await import("@/server/whatsapp/baileys-manager");
  return getQrDataUrl(accountId);
}

export async function disconnectNaoOficial(db: Db, accountId: string): Promise<void> {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "nao_oficial") {
    throw new ApiError(422, "Esta conta não é do tipo Não-oficial");
  }
  const { disconnectAccount } = await import("@/server/whatsapp/baileys-manager");
  await disconnectAccount(db, accountId);
}
