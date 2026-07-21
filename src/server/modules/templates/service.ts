import { Db, ObjectId } from "mongodb";

import { TemplateDoc, TemplateStatus } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import { getMetaClient, MetaTemplateComponentInput } from "@/server/whatsapp/meta-client";
import * as templatesRepo from "@/server/modules/templates/repository";
import * as accountsRepo from "@/server/modules/whatsapp-accounts/repository";
import { CreateTemplateInput } from "@/server/modules/templates/types";

export function toPublicTemplate(template: TemplateDoc) {
  return {
    id: template._id.toHexString(),
    accountId: template.accountId.toHexString(),
    metaTemplateId: template.metaTemplateId,
    name: template.name,
    category: template.category,
    language: template.language,
    components: template.components,
    variableSamples: template.variableSamples,
    status: template.status,
    rejectedReason: template.rejectedReason,
    lastSyncedAt: template.lastSyncedAt,
    createdAt: template.createdAt,
  };
}

export async function listTemplates(db: Db, session: Session) {
  const condition = session.allAccounts
    ? undefined
    : { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) };
  const templates = await templatesRepo.findTemplatesByAccountCondition(db, condition);
  return templates.map(toPublicTemplate);
}

/** Cria o template localmente e envia pra aprovação de verdade na Graph API — o `status`
 *  inicial devolvido pela Meta normalmente já vem como "PENDING". */
export async function createTemplate(db: Db, input: CreateTemplateInput) {
  const account = await accountsRepo.findAccountById(db, input.accountId);
  if (!account) throw new ApiError(404, "Conta WhatsApp não encontrada");
  if (account.type !== "oficial" || !account.oficial) {
    throw new ApiError(422, "Templates só podem ser criados numa conta Oficial (Meta Cloud API)");
  }

  const client = await getMetaClient(db, input.accountId);
  const metaComponents: MetaTemplateComponentInput[] = input.components.map((component) => ({
    type: component.type,
    format: component.format,
    text: component.text,
    buttons: component.buttons?.map((button) => ({
      type: button.type,
      text: button.text,
      url: button.url,
      phone_number: button.phoneNumber,
    })),
  }));

  const result = await client.templates.create(account.oficial.wabaId, {
    name: input.name,
    category: input.category,
    language: input.language,
    components: metaComponents,
  });

  const now = new Date();
  const template: TemplateDoc = {
    _id: new ObjectId(),
    accountId: account._id,
    metaTemplateId: result.id,
    name: input.name,
    category: input.category,
    language: input.language,
    components: input.components,
    variableSamples: input.variableSamples,
    status: (result.status?.toLowerCase() as TemplateStatus) || "pending",
    rejectedReason: null,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await templatesRepo.insertTemplate(db, template);
  return toPublicTemplate(template);
}

export async function deleteTemplate(db: Db, templateId: string): Promise<void> {
  const template = await templatesRepo.findTemplateById(db, templateId);
  if (!template) throw new ApiError(404, "Template não encontrado");
  const account = await accountsRepo.findAccountByIdRaw(db, template.accountId);
  if (account?.type === "oficial" && account.oficial) {
    const client = await getMetaClient(db, template.accountId.toHexString());
    await client.templates.delete(account.oficial.wabaId, template.name).catch(() => undefined);
  }
  await templatesRepo.deleteTemplate(db, templateId);
}

/** Re-checa o status de um template específico contra a Meta — usado pelo botão
 *  "sincronizar" manual e pelo fallback de baixa frequência (`template-sync` job). */
export async function syncTemplateStatus(db: Db, templateId: string) {
  const template = await templatesRepo.findTemplateById(db, templateId);
  if (!template) throw new ApiError(404, "Template não encontrado");
  const account = await accountsRepo.findAccountByIdRaw(db, template.accountId);
  if (!account || account.type !== "oficial" || !account.oficial) {
    throw new ApiError(422, "Conta Oficial não encontrada para este template");
  }

  const client = await getMetaClient(db, template.accountId.toHexString());
  const { data } = await client.templates.list(account.oficial.wabaId);
  const match = data.find((item) => item.id === template.metaTemplateId || item.name === template.name);
  if (!match) return toPublicTemplate(template);

  const status = String(match.status ?? "").toLowerCase() as TemplateStatus;
  const updated = await templatesRepo.updateTemplate(db, templateId, {
    status: status || template.status,
    rejectedReason: status === "rejected" ? String((match as { rejected_reason?: string }).rejected_reason ?? "") : null,
    lastSyncedAt: new Date(),
  });
  return toPublicTemplate(updated!);
}
