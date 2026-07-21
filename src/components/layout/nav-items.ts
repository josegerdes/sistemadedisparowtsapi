import type { LucideIcon } from "lucide-react";
import {
  Contact,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  MessageSquareText,
  Send,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Visão geral",
    items: [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" }],
  },
  {
    title: "WhatsApp",
    items: [
      { title: "Contas WhatsApp", url: "/whatsapp-accounts", icon: Smartphone, permission: "whatsapp_accounts.view" },
      { title: "Templates", url: "/templates", icon: MessageSquareText, permission: "templates.view" },
      { title: "Inbox", url: "/inbox", icon: Inbox, permission: "inbox.view" },
    ],
  },
  {
    title: "Disparo",
    items: [
      { title: "Contatos", url: "/contact-lists", icon: Contact, permission: "contacts.view" },
      { title: "Campanhas", url: "/campaigns", icon: Send, permission: "campaigns.view" },
    ],
  },
  {
    title: "Administração",
    items: [
      { title: "Usuários", url: "/settings/users", icon: Users, permission: "users.manage" },
      { title: "Roles", url: "/settings/roles", icon: Shield, permission: "roles.manage" },
    ],
  },
  {
    title: "Ajuda",
    items: [{ title: "Documentação", url: "/docs", icon: HelpCircle }],
  },
];
