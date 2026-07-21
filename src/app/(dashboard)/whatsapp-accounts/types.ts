export interface AccountOficialPublic {
  accessTokenMasked: string;
  phoneNumberId: string;
  wabaId: string;
  businessAccountId: string;
  displayPhoneNumber: string | null;
  tier: string;
  lastVerifiedAt: string | null;
}

export interface AccountNaoOficialPublic {
  connectedNumber: string | null;
  lastQrAt: string | null;
  lastConnectedAt: string | null;
  lastDisconnectReason: string | null;
}

export interface AccountPublic {
  id: string;
  ownerId: string;
  name: string;
  type: "oficial" | "nao_oficial";
  status: "connected" | "disconnected" | "pending" | "error";
  statusMessage: string | null;
  oficial: AccountOficialPublic | null;
  naoOficial: AccountNaoOficialPublic | null;
  createdAt: string;
}
