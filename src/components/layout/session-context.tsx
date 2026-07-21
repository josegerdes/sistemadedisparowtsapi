"use client";

import { createContext, useContext } from "react";

export interface ClientSession {
  userId: string;
  name: string;
  email: string;
  color: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession deve ser usado dentro de SessionProvider");
  return session;
}

export function useHasPermission(permission: string): boolean {
  const session = useSession();
  return session.permissions.includes(permission);
}
