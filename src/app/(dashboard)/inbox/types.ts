export interface ConversationPublic {
  id: string;
  accountId: string;
  channelType: "oficial" | "nao_oficial";
  contactPhone: string;
  contactName: string | null;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  windowExpiresAt: string | null;
}

export interface MessagePublic {
  id: string;
  direction: "inbound" | "outbound";
  channelType: "oficial" | "nao_oficial";
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
}
