import { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  roleIds: ObjectId[];
  color: string;
  active: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDoc {
  _id: ObjectId;
  name: string;
  color: string;
  position: number;
  permissions: string[];
  allAccounts: boolean;
  accountIds: ObjectId[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WhatsappAccountType = "oficial" | "nao_oficial";
export type WhatsappAccountStatus = "connected" | "disconnected" | "pending" | "error";
export type WhatsappAccountTier = "TIER_250" | "TIER_1K" | "TIER_10K" | "TIER_100K" | "UNKNOWN";

export interface WhatsappAccountOficialConfig {
  accessTokenEnc: string;
  phoneNumberId: string;
  wabaId: string;
  businessAccountId: string;
  displayPhoneNumber: string | null;
  tier: WhatsappAccountTier;
  lastVerifiedAt: Date | null;
}

export interface WhatsappAccountNaoOficialConfig {
  connectedNumber: string | null;
  lastQrAt: Date | null;
  lastConnectedAt: Date | null;
  lastDisconnectReason: string | null;
}

export interface WhatsappAccountDoc {
  _id: ObjectId;
  ownerId: ObjectId;
  name: string;
  type: WhatsappAccountType;
  status: WhatsappAccountStatus;
  statusMessage: string | null;
  oficial: WhatsappAccountOficialConfig | null;
  naoOficial: WhatsappAccountNaoOficialConfig | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactDoc {
  _id: ObjectId;
  ownerId: ObjectId;
  phone: string;
  name: string | null;
  customFields: Record<string, string>;
  tags: string[];
  listIds: ObjectId[];
  optedOut: boolean;
  optedOutAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactListDoc {
  _id: ObjectId;
  ownerId: ObjectId;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
export type TemplateHeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type TemplateButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

export interface TemplateButtonDoc {
  type: TemplateButtonType;
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface TemplateComponentDoc {
  type: TemplateComponentType;
  format?: TemplateHeaderFormat;
  text?: string;
  buttons?: TemplateButtonDoc[];
}

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type TemplateStatus = "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled";

export interface TemplateDoc {
  _id: ObjectId;
  accountId: ObjectId;
  metaTemplateId: string | null;
  name: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponentDoc[];
  variableSamples: Record<string, string>;
  status: TemplateStatus;
  rejectedReason: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus = "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed" | "canceled";

export interface CampaignVariableSource {
  source: "field" | "literal";
  value: string;
}

export interface CampaignTotals {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignDoc {
  _id: ObjectId;
  ownerId: ObjectId;
  accountId: ObjectId;
  templateId: ObjectId;
  name: string;
  listIds: ObjectId[];
  adHocContactIds: ObjectId[];
  variableMapping: Record<string, CampaignVariableSource>;
  scheduledFor: Date | null;
  rateLimitPerMinute: number;
  status: CampaignStatus;
  totals: CampaignTotals;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignRecipientStatus = "queued" | "sending" | "sent" | "delivered" | "read" | "failed";

export interface CampaignRecipientDoc {
  _id: ObjectId;
  campaignId: ObjectId;
  contactId: ObjectId;
  phone: string;
  resolvedVariables: Record<string, string>;
  status: CampaignRecipientStatus;
  metaMessageId: string | null;
  error: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ChannelType = "oficial" | "nao_oficial";

export interface ConversationDoc {
  _id: ObjectId;
  accountId: ObjectId;
  channelType: ChannelType;
  contactPhone: string;
  contactId: ObjectId | null;
  contactName: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCount: number;
  windowExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "received";
export type MessageMediaType = "image" | "video" | "document" | "audio";

export interface MessageDoc {
  _id: ObjectId;
  conversationId: ObjectId;
  accountId: ObjectId;
  direction: MessageDirection;
  channelType: ChannelType;
  body: string;
  mediaUrl: string | null;
  mediaType: MessageMediaType | null;
  metaMessageId: string | null;
  status: MessageStatus;
  error: string | null;
  sentByUserId: ObjectId | null;
  createdAt: Date;
}

export type JobStatus = "pending" | "processing" | "done" | "failed";

export interface JobDoc {
  _id: ObjectId;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaileysAuthCredsDoc {
  _id: ObjectId; // = accountId
  accountId: ObjectId;
  creds: string; // JSON serializado com o BufferJSON do Baileys
  updatedAt: Date;
}

export interface BaileysAuthKeyDoc {
  _id: ObjectId;
  accountId: ObjectId;
  keyType: string;
  keyId: string;
  value: string; // JSON serializado com o BufferJSON do Baileys
  updatedAt: Date;
}
