export interface CampaignTotalsPublic {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface CampaignPublic {
  id: string;
  ownerId: string;
  accountId: string;
  templateId: string;
  name: string;
  listIds: string[];
  adHocContactIds: string[];
  variableMapping: Record<string, { source: "field" | "literal"; value: string }>;
  scheduledFor: string | null;
  rateLimitPerMinute: number;
  status: "draft" | "scheduled" | "sending" | "paused" | "completed" | "failed" | "canceled";
  totals: CampaignTotalsPublic;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface CampaignRecipientPublic {
  id: string;
  phone: string;
  status: string;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
}
