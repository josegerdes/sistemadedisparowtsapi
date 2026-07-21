"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, UserRound } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/layout/session-context";
import { RoleBadge } from "@/components/roles/role-badge";
import { RolePublic, UserPublic } from "@/app/(dashboard)/settings/types";

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const createUserSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("Informe um email válido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});
type CreateUserValues = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const session = useSession();

  const { data: users, isLoading } = useQuery<UserPublic[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users"),
  });
  const { data: roles } = useQuery<RolePublic[]>({ queryKey: ["roles"], queryFn: () => apiFetch("/api/roles") });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);

  const roleById = new Map((roles ?? []).map((role) => [role.id, role]));

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const createUser = useMutation({
    mutationFn: (values: CreateUserValues) =>
      apiFetch<UserPublic>("/api/users", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário criado");
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateUser = useMutation({
    mutationFn: (payload: { id: string; patch: Partial<UserPublic> }) =>
      apiFetch<UserPublic>(`/api/users/${payload.id}`, { method: "PATCH", body: JSON.stringify(payload.patch) }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(updated);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário apagado");
      setEditingUser(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleRole(user: UserPublic, roleId: string) {
    const roleIds = user.roleIds.includes(roleId)
      ? user.roleIds.filter((id) => id !== roleId)
      : [...user.roleIds, roleId];
    updateUser.mutate({ id: user.id, patch: { roleIds } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Membros do sistema e suas roles — o acesso a contas WhatsApp é definido nas roles ou por posse da conta
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Novo usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form className="space-y-4" onSubmit={createForm.handleSubmit((values) => createUser.mutate(values))}>
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha provisória</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" loading={createUser.isPending}>
                    Criar usuário
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  <UserRound className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Nenhum usuário cadastrado ainda
                </TableCell>
              </TableRow>
            )}
            {users?.map((user) => (
              <TableRow key={user.id} className="cursor-pointer" onClick={() => setEditingUser(user)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback style={{ backgroundColor: user.color, color: "white" }}>
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roleIds.map((roleId) => {
                      const role = roleById.get(roleId);
                      return role ? <RoleBadge key={roleId} name={role.name} color={role.color} /> : null;
                    })}
                    {user.roleIds.length === 0 && <span className="text-xs text-muted-foreground">Sem role</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "success" : "outline"}>{user.active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {editingUser && (
            <UserEditPanel
              user={editingUser}
              roles={roles ?? []}
              onToggleRole={(roleId) => toggleRole(editingUser, roleId)}
              onToggleActive={(active) => updateUser.mutate({ id: editingUser.id, patch: { active } })}
              latestUser={users?.find((u) => u.id === editingUser.id) ?? editingUser}
              canDelete={editingUser.id !== session.userId}
              onDelete={() => deleteUser.mutate(editingUser.id)}
              deleting={deleteUser.isPending}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UserEditPanel({
  user,
  latestUser,
  roles,
  onToggleRole,
  onToggleActive,
  canDelete,
  onDelete,
  deleting,
}: {
  user: UserPublic;
  latestUser: UserPublic;
  roles: RolePublic[];
  onToggleRole: (roleId: string) => void;
  onToggleActive: (value: boolean) => void;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const assignedRoles = roles.filter((role) => latestUser.roleIds.includes(role.id));
  const hasAllAccountsAccess = assignedRoles.some((role) => role.allAccounts);
  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback style={{ backgroundColor: user.color, color: "white" }}>
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <SheetTitle>{user.name}</SheetTitle>
            <SheetDescription>{user.email}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Usuário ativo</p>
          <p className="text-xs text-muted-foreground">Desative para bloquear o acesso sem excluir a conta</p>
        </div>
        <Switch checked={latestUser.active} onCheckedChange={onToggleActive} />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label>Roles</Label>
        <div className="space-y-1 rounded-md border p-2">
          {roles.map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
              <Checkbox checked={latestUser.roleIds.includes(role.id)} onCheckedChange={() => onToggleRole(role.id)} />
              <RoleBadge name={role.name} color={role.color} />
            </label>
          ))}
          {roles.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Nenhuma role criada ainda</p>}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Acesso a contas WhatsApp</Label>
        <p className="rounded-md border px-3 py-2.5 text-sm text-muted-foreground">
          {assignedRoles.length === 0 && "Sem role atribuída — acesso só às contas que o próprio usuário criar."}
          {assignedRoles.length > 0 &&
            hasAllAccountsAccess &&
            "Acesso a todas as contas, concedido por uma das roles atribuídas."}
          {assignedRoles.length > 0 &&
            !hasAllAccountsAccess &&
            "Além das contas que o usuário criar, definido pela configuração de cada role atribuída."}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Zona de risco</Label>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={!canDelete || deleting}
              title={!canDelete ? "Você não pode apagar sua própria conta" : undefined}
            >
              <Trash2 className="h-4 w-4" />
              Apagar usuário
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar &quot;{user.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita — o usuário perde o acesso ao sistema imediatamente.
                Se for só pra bloquear o acesso sem apagar o cadastro, use o interruptor &quot;Usuário
                ativo&quot; acima em vez disso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Apagar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
