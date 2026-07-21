export interface ContactListPublic {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

export interface ContactPublic {
  id: string;
  ownerId: string;
  phone: string;
  name: string | null;
  customFields: Record<string, string>;
  tags: string[];
  listIds: string[];
  optedOut: boolean;
  createdAt: string;
}
