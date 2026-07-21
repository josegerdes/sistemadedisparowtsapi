/**
 * Catálogo fixo de permissões, agrupado por categoria — estilo painel de
 * permissões do Discord (Server Settings > Roles). `roles` no banco guardam
 * um array de chaves daqui.
 */
export interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

export interface PermissionCategory {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    permissions: [
      { key: "dashboard.view", label: "Ver dashboard", description: "Visualizar KPIs de campanhas, contas e Inbox" },
    ],
  },
  {
    key: "whatsapp_accounts",
    label: "Contas WhatsApp",
    permissions: [
      { key: "whatsapp_accounts.view", label: "Ver contas WhatsApp", description: "Visualizar contas conectadas (Oficial e Não-oficial)" },
      { key: "whatsapp_accounts.manage", label: "Gerenciar contas WhatsApp", description: "Cadastrar, conectar e remover contas WhatsApp próprias" },
    ],
  },
  {
    key: "templates",
    label: "Templates",
    permissions: [
      { key: "templates.view", label: "Ver templates", description: "Visualizar templates e status de aprovação" },
      { key: "templates.manage", label: "Gerenciar templates", description: "Criar templates e enviar para aprovação da Meta" },
    ],
  },
  {
    key: "contacts",
    label: "Contatos",
    permissions: [
      { key: "contacts.view", label: "Ver contatos e listas", description: "Visualizar contatos e listas de contatos" },
      { key: "contacts.manage", label: "Gerenciar contatos e listas", description: "Criar/editar contatos, listas e importar CSV" },
    ],
  },
  {
    key: "campaigns",
    label: "Campanhas",
    permissions: [
      { key: "campaigns.view", label: "Ver campanhas", description: "Visualizar campanhas e relatórios de envio" },
      { key: "campaigns.manage", label: "Gerenciar campanhas", description: "Criar, iniciar, pausar e cancelar campanhas" },
    ],
  },
  {
    key: "inbox",
    label: "Inbox",
    permissions: [
      { key: "inbox.view", label: "Ver conversas", description: "Visualizar o histórico de conversas" },
      { key: "inbox.manage", label: "Responder conversas", description: "Enviar respostas manuais na Inbox" },
    ],
  },
  {
    key: "administration",
    label: "Administração",
    permissions: [
      { key: "users.manage", label: "Gerenciar usuários", description: "Criar/editar usuários e atribuir roles" },
      { key: "roles.manage", label: "Gerenciar roles", description: "Criar/editar roles e permissões" },
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_CATEGORIES.flatMap((category) =>
  category.permissions.map((permission) => permission.key)
);

export function isValidPermission(key: string): boolean {
  return ALL_PERMISSIONS.includes(key);
}
