"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { PERMISSION_CATEGORIES } from "@/server/rbac/permissions";
import { AccountAccessPicker } from "@/components/whatsapp-accounts/account-access-picker";
import { RolePublic } from "@/app/(dashboard)/settings/types";
import { AccountOption } from "@/components/layout/account-context";

const COLOR_PRESETS = [
  "#25D366", "#128C7E", "#34B7F1", "#075E54", "#ED4245",
  "#3BA55D", "#FAA61A", "#9B59B6", "#1ABC9C", "#7289DA",
];

export default function RolesPage() {
  const queryClient = useQueryClient();
  const { data: roles, isLoading } = useQuery<RolePublic[]>({
    queryKey: ["roles"],
    queryFn: () => apiFetch("/api/roles"),
  });
  const { data: accounts } = useQuery<AccountOption[]>({
    queryKey: ["whatsapp-accounts", "directory"],
    queryFn: () => apiFetch("/api/whatsapp-accounts/directory"),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && roles?.length) setSelectedId(roles[0]?.id ?? null);
  }, [roles, selectedId]);

  const selected = roles?.find((role) => role.id === selectedId) ?? null;

  const createRole = useMutation({
    mutationFn: () =>
      apiFetch<RolePublic>("/api/roles", {
        method: "POST",
        body: JSON.stringify({
          name: "Nova role",
          color: COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)],
          permissions: [],
        }),
      }),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedId(role.id);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRole = useMutation({
    mutationFn: (payload: { id: string; patch: Partial<RolePublic> }) =>
      apiFetch<RolePublic>(`/api/roles/${payload.id}`, { method: "PATCH", body: JSON.stringify(payload.patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRole = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedId(null);
      toast.success("Role excluída");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch<RolePublic[]>("/api/roles/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
    onSuccess: (updated) => queryClient.setQueryData(["roles"], updated),
    onError: (error: Error) => toast.error(error.message),
  });

  function moveRole(index: number, direction: -1 | 1) {
    if (!roles) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= roles.length) return;
    const ids = roles.map((role) => role.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved as string);
    reorder.mutate(ids);
  }

  function togglePermission(permissionKey: string) {
    if (!selected) return;
    const has = selected.permissions.includes(permissionKey);
    const permissions = has
      ? selected.permissions.filter((key) => key !== permissionKey)
      : [...selected.permissions, permissionKey];
    updateRole.mutate({ id: selected.id, patch: { permissions } });
  }

  function toggleAccount(accountId: string) {
    if (!selected) return;
    const has = selected.accountIds.includes(accountId);
    const accountIds = has ? selected.accountIds.filter((id) => id !== accountId) : [...selected.accountIds, accountId];
    updateRole.mutate({ id: selected.id, patch: { accountIds } });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Um usuário pode ter várias roles — as permissões efetivas são a soma de todas elas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-medium">Roles ({roles?.length ?? 0})</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => createRole.mutate()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-[520px]">
            <div className="p-2">
              {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
              {roles?.map((role, index) => (
                <div
                  key={role.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    role.id === selectedId ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={() => setSelectedId(role.id)}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                    <span className="truncate">{role.name}</span>
                  </button>
                  <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveRole(index, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveRole(index, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border bg-card p-6">
          {!selected && (
            <div className="flex h-full flex-col items-center justify-center py-16 text-muted-foreground">
              <Shield className="mb-2 h-8 w-8 opacity-50" />
              Selecione uma role para editar
            </div>
          )}
          {selected && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    defaultValue={selected.name}
                    key={selected.id}
                    onBlur={(event) => {
                      if (event.target.value && event.target.value !== selected.name) {
                        updateRole.mutate({ id: selected.id, patch: { name: event.target.value } });
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex gap-1.5">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "h-7 w-7 rounded-full border-2",
                          selected.color === color ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateRole.mutate({ id: selected.id, patch: { color } })}
                      />
                    ))}
                  </div>
                </div>
                {!selected.isDefault && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Excluir a role "${selected.name}"?`)) deleteRole.mutate(selected.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir role
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  As contas marcadas aqui somam com as que o próprio usuário já for dono — quem tiver esta role
                  enxerga essas contas mesmo sem tê-las criado.
                </p>
                <AccountAccessPicker
                  allAccounts={selected.allAccounts}
                  accountIds={selected.accountIds}
                  accounts={accounts ?? []}
                  onToggleAllAccounts={(value) => updateRole.mutate({ id: selected.id, patch: { allAccounts: value } })}
                  onToggleAccount={toggleAccount}
                />
              </div>

              <Separator />

              <div className="space-y-6">
                <p className="text-sm font-medium">Permissões</p>
                {PERMISSION_CATEGORIES.map((category) => (
                  <div key={category.key} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {category.label}
                    </p>
                    <div className="space-y-1 rounded-md border">
                      {category.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className="flex items-center justify-between gap-4 border-b px-3 py-2.5 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-medium">{permission.label}</p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Switch
                            checked={selected.permissions.includes(permission.key)}
                            onCheckedChange={() => togglePermission(permission.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
