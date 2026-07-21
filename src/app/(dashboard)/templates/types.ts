export interface TemplateComponentPublic {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  buttons?: { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phoneNumber?: string }[];
}

export interface TemplatePublic {
  id: string;
  accountId: string;
  metaTemplateId: string | null;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: TemplateComponentPublic[];
  variableSamples: Record<string, string>;
  status: "draft" | "pending" | "approved" | "rejected" | "paused" | "disabled";
  rejectedReason: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
}
