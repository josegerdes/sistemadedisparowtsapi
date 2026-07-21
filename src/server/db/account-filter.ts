import { ObjectId } from "mongodb";

import { AccountAccessScope } from "@/server/auth/guards";

/** Monta a condição de filtro `$in` de `accountId`/`ownerId` a partir do escopo da sessão —
 *  `null` (allAccounts) não filtra nada, um array vazio nunca deve casar com nada. */
export function buildAccountIdCondition(scope: AccountAccessScope): { $in: ObjectId[] } | undefined {
  if (scope.accountIds === null) return undefined;
  return { $in: scope.accountIds.map((id) => ObjectId.createFromHexString(id)) };
}
