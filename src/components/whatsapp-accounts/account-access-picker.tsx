"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AccountOption } from "@/components/layout/account-context";

interface AccountAccessPickerProps {
  allAccounts: boolean;
  accountIds: string[];
  accounts: AccountOption[];
  onToggleAllAccounts: (value: boolean) => void;
  onToggleAccount: (accountId: string) => void;
}

/**
 * Seletor de "quais contas WhatsApp" — usado na edição de Role: toggle "acesso
 * a todas as contas" + checkbox por conta. O acesso efetivo de um usuário é a
 * união do que ele é dono + do que qualquer uma das suas roles concede.
 */
export function AccountAccessPicker({
  allAccounts,
  accountIds,
  accounts,
  onToggleAllAccounts,
  onToggleAccount,
}: AccountAccessPickerProps) {
  return (
    <div className="space-y-3">
      <Label>Contas WhatsApp</Label>
      <label className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5">
        <span className="text-sm font-medium">Acesso a todas as contas</span>
        <Switch checked={allAccounts} onCheckedChange={onToggleAllAccounts} />
      </label>
      {!allAccounts && (
        <div className="space-y-1 rounded-md border p-2">
          {accounts.map((account) => (
            <label key={account.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
              <Checkbox checked={accountIds.includes(account.id)} onCheckedChange={() => onToggleAccount(account.id)} />
              <span className="text-sm">{account.name}</span>
            </label>
          ))}
          {accounts.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Nenhuma conta cadastrada</p>}
        </div>
      )}
    </div>
  );
}
