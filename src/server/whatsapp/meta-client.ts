import { Db } from "mongodb";

import { decryptSecret } from "@/server/crypto/secrets";
import { ApiError } from "@/server/auth/guards";
import { MetaApiError } from "@/server/whatsapp/meta-errors";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";

export { MetaApiError } from "@/server/whatsapp/meta-errors";

function baseUrl(): string {
  const version = process.env.META_GRAPH_API_VERSION ?? "v21.0";
  return `https://graph.facebook.com/${version}`;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poucas tentativas com espera crescente pra erro transitório (rate limit, instabilidade,
 * falha de rede) — igual ao client do Asaas do projeto de referência. Erros que não são
 * transitórios (token inválido, template mal formado etc.) são lançados na primeira tentativa.
 */
async function request<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
          ...init.headers,
        },
      });
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(2 ** attempt * 300);
      continue;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 300);
        continue;
      }
      const metaError = data?.error ?? {};
      throw new MetaApiError(
        metaError.error_user_msg ?? metaError.message ?? "Falha ao comunicar com a Meta",
        response.status,
        metaError.code,
        metaError.type
      );
    }
    return data as T;
  }
}

export interface MetaTemplateComponentInput {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

export interface MetaTemplateCreateInput {
  name: string;
  category: string;
  language: string;
  components: MetaTemplateComponentInput[];
}

export interface MetaTemplateResult {
  id: string;
  status: string;
  category: string;
}

export interface MetaPhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
}

export interface MetaSendMessageResult {
  messages: { id: string }[];
}

export interface MetaClient {
  templates: {
    create(wabaId: string, input: MetaTemplateCreateInput): Promise<MetaTemplateResult>;
    list(wabaId: string): Promise<{ data: Record<string, unknown>[] }>;
    delete(wabaId: string, name: string): Promise<void>;
  };
  messages: {
    sendTemplate(
      phoneNumberId: string,
      to: string,
      templateName: string,
      language: string,
      components: Record<string, unknown>[]
    ): Promise<MetaSendMessageResult>;
    sendText(phoneNumberId: string, to: string, body: string): Promise<MetaSendMessageResult>;
  };
  phoneNumbers: {
    get(phoneNumberId: string): Promise<MetaPhoneNumberInfo>;
  };
  subscribedApps: {
    subscribe(wabaId: string): Promise<void>;
  };
}

function buildClient(accessToken: string): MetaClient {
  return {
    templates: {
      create: (wabaId, input) =>
        request(accessToken, `/${wabaId}/message_templates`, { method: "POST", body: JSON.stringify(input) }),
      list: (wabaId) => request(accessToken, `/${wabaId}/message_templates?limit=200`),
      delete: (wabaId, name) =>
        request(accessToken, `/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, { method: "DELETE" }),
    },
    messages: {
      sendTemplate: (phoneNumberId, to, templateName, language, components) =>
        request(accessToken, `/${phoneNumberId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: { name: templateName, language: { code: language }, components },
          }),
        }),
      sendText: (phoneNumberId, to, body) =>
        request(accessToken, `/${phoneNumberId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body },
          }),
        }),
    },
    phoneNumbers: {
      get: (phoneNumberId) =>
        request(accessToken, `/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`),
    },
    subscribedApps: {
      subscribe: (wabaId) =>
        request(accessToken, `/${wabaId}/subscribed_apps`, { method: "POST" }),
    },
  };
}

/**
 * Carrega e descriptografa o access token da conta Oficial e devolve um client tipado —
 * mesmo papel do `getAsaasClient` do projeto de referência.
 */
export async function getMetaClient(db: Db, accountId: string): Promise<MetaClient> {
  const account = await accountsRepo.findAccountById(db, accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "oficial" || !account.oficial) {
    throw new ApiError(422, "Esta conta não é do tipo Oficial (Meta Cloud API)");
  }
  const accessToken = decryptSecret(account.oficial.accessTokenEnc);
  return buildClient(accessToken);
}
