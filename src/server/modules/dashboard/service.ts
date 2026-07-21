import { Db, ObjectId } from "mongodb";

import { Session } from "@/server/auth/session";
import { collections } from "@/server/db/collections";

export interface DashboardSummary {
  accountsConnected: number;
  accountsTotal: number;
  campaignsActive: number;
  templatesPending: number;
  conversationsUnread: number;
  messages: { sent: number; delivered: number; read: number; failed: number };
}

/** Agregação simples em memória (volume de dados pequeno pra esse domínio) — mesmo estilo do
 *  dashboard do projeto de referência, sem pipeline de agregação do Mongo por enquanto. */
export async function getDashboardSummary(db: Db, session: Session): Promise<DashboardSummary> {
  const accountCondition = session.allAccounts
    ? {}
    : { _id: { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) } };

  const [accounts, campaigns, templatesPending, conversations] = await Promise.all([
    collections.whatsappAccounts(db).find(accountCondition).toArray(),
    collections
      .campaigns(db)
      .find(
        session.allAccounts
          ? { status: { $in: ["sending", "scheduled"] } }
          : { status: { $in: ["sending", "scheduled"] }, accountId: { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) } }
      )
      .toArray(),
    collections.templates(db).countDocuments({ status: "pending" }),
    collections
      .conversations(db)
      .find(
        session.allAccounts
          ? { unreadCount: { $gt: 0 } }
          : { unreadCount: { $gt: 0 }, accountId: { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) } }
      )
      .toArray(),
  ]);

  const allCampaigns = await collections
    .campaigns(db)
    .find(
      session.allAccounts
        ? {}
        : { accountId: { $in: session.accountIds.map((id) => ObjectId.createFromHexString(id)) } }
    )
    .toArray();

  const messages = allCampaigns.reduce(
    (acc, campaign) => {
      acc.sent += campaign.totals.sent;
      acc.delivered += campaign.totals.delivered;
      acc.read += campaign.totals.read;
      acc.failed += campaign.totals.failed;
      return acc;
    },
    { sent: 0, delivered: 0, read: 0, failed: 0 }
  );

  return {
    accountsConnected: accounts.filter((a) => a.status === "connected").length,
    accountsTotal: accounts.length,
    campaignsActive: campaigns.length,
    templatesPending,
    conversationsUnread: conversations.length,
    messages,
  };
}
