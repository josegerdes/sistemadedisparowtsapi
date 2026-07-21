"use client";

import { Check, ChevronsUpDown, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount } from "@/components/layout/account-context";

export function AccountSwitcher() {
  const { accounts, currentAccountId, setCurrentAccountId, isLoading } = useAccount();

  if (isLoading) return null;
  if (!accounts.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Nenhuma conta WhatsApp
      </div>
    );
  }

  const current = accounts.find((account) => account.id === currentAccountId) ?? accounts[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="max-w-[10rem] truncate">{current?.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Contas WhatsApp</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.map((account) => (
          <DropdownMenuItem key={account.id} onClick={() => setCurrentAccountId(account.id)}>
            <Check className={`h-4 w-4 ${account.id === currentAccountId ? "opacity-100" : "opacity-0"}`} />
            {account.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
