import { Db } from "mongodb";
import type {
  BaileysAuthCredsDoc,
  BaileysAuthKeyDoc,
  CampaignDoc,
  CampaignRecipientDoc,
  ContactDoc,
  ContactListDoc,
  ConversationDoc,
  JobDoc,
  MessageDoc,
  RoleDoc,
  TemplateDoc,
  UserDoc,
  WhatsappAccountDoc,
} from "@/server/db/schema";

/**
 * Getters tipados por coleção — evita `db.collection("nomeCru")` espalhado
 * pelas rotas/serviços.
 */
export const collections = {
  users: (db: Db) => db.collection<UserDoc>("users"),
  roles: (db: Db) => db.collection<RoleDoc>("roles"),
  whatsappAccounts: (db: Db) => db.collection<WhatsappAccountDoc>("whatsappAccounts"),
  contacts: (db: Db) => db.collection<ContactDoc>("contacts"),
  contactLists: (db: Db) => db.collection<ContactListDoc>("contactLists"),
  templates: (db: Db) => db.collection<TemplateDoc>("templates"),
  campaigns: (db: Db) => db.collection<CampaignDoc>("campaigns"),
  campaignRecipients: (db: Db) => db.collection<CampaignRecipientDoc>("campaignRecipients"),
  conversations: (db: Db) => db.collection<ConversationDoc>("conversations"),
  messages: (db: Db) => db.collection<MessageDoc>("messages"),
  jobs: (db: Db) => db.collection<JobDoc>("jobs"),
  baileysAuthCreds: (db: Db) => db.collection<BaileysAuthCredsDoc>("baileysAuthCreds"),
  baileysAuthKeys: (db: Db) => db.collection<BaileysAuthKeyDoc>("baileysAuthKeys"),
};
