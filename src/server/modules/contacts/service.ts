import { Db, ObjectId } from "mongodb";
import Papa from "papaparse";

import { ContactDoc } from "@/server/db/schema";
import { ApiError } from "@/server/auth/guards";
import { Session } from "@/server/auth/session";
import * as contactsRepo from "@/server/modules/contacts/repository";
import { assertListOwnership, refreshContactCount } from "@/server/modules/contact-lists/service";
import { CreateContactInput, ImportCsvInput, UpdateContactInput } from "@/server/modules/contacts/types";

export function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function toPublicContact(contact: ContactDoc) {
  return {
    id: contact._id.toHexString(),
    ownerId: contact.ownerId.toHexString(),
    phone: contact.phone,
    name: contact.name,
    customFields: contact.customFields,
    tags: contact.tags,
    listIds: contact.listIds.map((id) => id.toHexString()),
    optedOut: contact.optedOut,
    createdAt: contact.createdAt,
  };
}

export async function listContacts(db: Db, session: Session, listId?: string) {
  const ownerId = session.isSuperAdmin ? null : ObjectId.createFromHexString(session.userId);
  const contacts = await contactsRepo.findContacts(db, ownerId, listId ? ObjectId.createFromHexString(listId) : undefined);
  return contacts.map(toPublicContact);
}

async function assertOwnership(db: Db, session: Session, contactId: string): Promise<ContactDoc> {
  const contact = await contactsRepo.findContactById(db, contactId);
  if (!contact) throw new ApiError(404, "Contato não encontrado");
  if (!session.isSuperAdmin && contact.ownerId.toHexString() !== session.userId) {
    throw new ApiError(403, "Você não tem acesso a este contato");
  }
  return contact;
}

export async function createContact(db: Db, session: Session, input: CreateContactInput) {
  const ownerId = ObjectId.createFromHexString(session.userId);
  const phone = normalizePhone(input.phone);
  const existing = await contactsRepo.findContactByPhone(db, ownerId, phone);
  if (existing) throw new ApiError(409, "Já existe um contato com este telefone");

  const now = new Date();
  const contact: ContactDoc = {
    _id: new ObjectId(),
    ownerId,
    phone,
    name: input.name ?? null,
    customFields: input.customFields,
    tags: input.tags,
    listIds: input.listIds.map((id) => ObjectId.createFromHexString(id)),
    optedOut: false,
    optedOutAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await contactsRepo.insertContact(db, contact);
  await Promise.all(contact.listIds.map((listId) => refreshContactCount(db, listId)));
  return toPublicContact(contact);
}

export async function updateContact(db: Db, session: Session, contactId: string, input: UpdateContactInput) {
  const contact = await assertOwnership(db, session, contactId);
  const patch: Partial<ContactDoc> = { ...input };
  if (input.optedOut !== undefined) {
    patch.optedOutAt = input.optedOut ? new Date() : null;
  }
  const updated = await contactsRepo.updateContact(db, contactId, patch);
  if (!updated) throw new ApiError(404, "Contato não encontrado");
  if (input.optedOut !== undefined) await Promise.all(contact.listIds.map((listId) => refreshContactCount(db, listId)));
  return toPublicContact(updated);
}

export async function deleteContact(db: Db, session: Session, contactId: string): Promise<void> {
  const contact = await assertOwnership(db, session, contactId);
  await contactsRepo.deleteContact(db, contactId);
  await Promise.all(contact.listIds.map((listId) => refreshContactCount(db, listId)));
}

export async function addToList(db: Db, session: Session, contactId: string, listId: string): Promise<void> {
  await assertOwnership(db, session, contactId);
  await assertListOwnership(db, session, listId);
  await contactsRepo.addContactToList(db, ObjectId.createFromHexString(contactId), ObjectId.createFromHexString(listId));
  await refreshContactCount(db, ObjectId.createFromHexString(listId));
}

export async function removeFromList(db: Db, session: Session, contactId: string, listId: string): Promise<void> {
  await assertOwnership(db, session, contactId);
  await assertListOwnership(db, session, listId);
  await contactsRepo.removeContactFromList(db, ObjectId.createFromHexString(contactId), ObjectId.createFromHexString(listId));
  await refreshContactCount(db, ObjectId.createFromHexString(listId));
}

export interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
}

/** Espera colunas `phone` (obrigatória) e `name` (opcional) — qualquer outra coluna vira
 *  `customFields`, disponível pra mapear em variáveis de template nas campanhas. Dedup por
 *  telefone dentro do dono: contato existente é atualizado e só adicionado à lista, nunca duplicado. */
export async function importCsv(db: Db, session: Session, listId: string, input: ImportCsvInput): Promise<ImportSummary> {
  await assertListOwnership(db, session, listId);
  const ownerId = ObjectId.createFromHexString(session.userId);
  const listObjectId = ObjectId.createFromHexString(listId);

  const parsed = Papa.parse<Record<string, string>>(input.csv, { header: true, skipEmptyLines: true });
  const rows = parsed.data;

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const rawPhone = row.phone ?? row.telefone ?? row.Phone ?? row.Telefone;
    if (!rawPhone) {
      skipped++;
      continue;
    }
    const phone = normalizePhone(rawPhone);
    if (phone.length < 8) {
      skipped++;
      continue;
    }
    const name = row.name ?? row.nome ?? row.Name ?? row.Nome ?? null;
    const customFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (["phone", "telefone", "name", "nome"].includes(key.toLowerCase())) continue;
      if (value) customFields[key] = value;
    }

    await contactsRepo.upsertByPhone(db, ownerId, phone, { name, customFields, listId: listObjectId });
    imported++;
  }

  await refreshContactCount(db, listObjectId);
  return { imported, updated: 0, skipped, total: rows.length };
}
