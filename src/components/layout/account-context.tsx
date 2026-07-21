"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AccountOption {
  id: string;
  name: string;
  type?: "oficial" | "nao_oficial";
  status?: string;
}

interface AccountContextValue {
  accounts: AccountOption[];
  currentAccountId: string | null;
  setCurrentAccountId: (accountId: string) => void;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);
const STORAGE_KEY = "dwa:currentAccountId";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<AccountOption[]>({
    queryKey: ["whatsapp-accounts", "mine"],
    queryFn: async () => {
      const response = await fetch("/api/whatsapp-accounts/mine");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const [currentAccountId, setCurrentAccountIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !data.length) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && data.some((account) => account.id === stored);
    setCurrentAccountIdState(valid ? stored : (data[0]?.id ?? null));
  }, [data]);

  function setCurrentAccountId(accountId: string) {
    setCurrentAccountIdState(accountId);
    window.localStorage.setItem(STORAGE_KEY, accountId);
  }

  const value = useMemo(
    () => ({ accounts: data ?? [], currentAccountId, setCurrentAccountId, isLoading }),
    [data, currentAccountId, isLoading]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error("useAccount deve ser usado dentro de AccountProvider");
  return context;
}
