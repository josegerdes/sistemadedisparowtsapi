import { redirect } from "next/navigation";

import { SidebarProvider } from "@/components/ui/sidebar";
import { getSession } from "@/server/auth/session";
import { SessionProvider } from "@/components/layout/session-context";
import { AccountProvider } from "@/components/layout/account-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const clientSession = {
    userId: session.userId,
    name: session.name,
    email: session.email,
    color: session.color,
    permissions: Array.from(session.permissions),
    isSuperAdmin: session.isSuperAdmin,
  };

  return (
    <SessionProvider session={clientSession}>
      <AccountProvider>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex min-h-svh w-full flex-col">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
          </div>
        </SidebarProvider>
      </AccountProvider>
    </SessionProvider>
  );
}
