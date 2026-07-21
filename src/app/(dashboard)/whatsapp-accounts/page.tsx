"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Cloud, Plus, QrCode, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { AccountPublic } from "@/app/(dashboard)/whatsapp-accounts/types";

const createAccountSchema = z.object({
  name: z.string().min(2, "Informe um nome"),
  type: z.enum(["oficial", "nao_oficial"]),
  accessToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
  businessAccountId: z.string().optional(),
});
type CreateAccountValues = z.infer<typeof createAccountSchema>;

const STATUS_LABEL: Record<AccountPublic["status"], { label: string; variant: "success" | "outline" | "destructive" | "warning" }> = {
  connected: { label: "Conectada", variant: "success" },
  pending: { label: "Aguardando", variant: "warning" },
  disconnected: { label: "Desconectada", variant: "outline" },
  error: { label: "Erro", variant: "destructive" },
};

export default function WhatsappAccountsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: accounts, isLoading } = useQuery<AccountPublic[]>({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch("/api/whatsapp-accounts"),
  });

  const form = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { name: "", type: "oficial", accessToken: "", phoneNumberId: "", wabaId: "", businessAccountId: "" },
  });
  const type = form.watch("type");

  const createAccount = useMutation({
    mutationFn: (values: CreateAccountValues) =>
      apiFetch<AccountPublic>("/api/whatsapp-accounts", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          type: values.type,
          ...(values.type === "oficial"
            ? {
                oficial: {
                  accessToken: values.accessToken,
                  phoneNumberId: values.phoneNumberId,
                  wabaId: values.wabaId,
                  businessAccountId: values.businessAccountId,
                },
              }
            : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts", "mine"] });
      toast.success("Conta WhatsApp criada");
      setCreateOpen(false);
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Conecte números via API Oficial (Meta Cloud API) para disparo em massa, ou via QR Code
            (Não-oficial) só para a Inbox — economiza a tarifa por conversa da Meta nas respostas manuais.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nova conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova conta WhatsApp</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit((values) => createAccount.mutate(values))}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Suporte, Vendas..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="oficial">Oficial (Meta Cloud API) — disparo em massa</SelectItem>
                          <SelectItem value="nao_oficial">Não-oficial (QR Code) — só Inbox</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {type === "oficial" && (
                  <div className="space-y-4 rounded-md border p-3">
                    <FormField
                      control={form.control}
                      name="accessToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Access token</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="EAAB..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone number ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="wabaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp Business Account ID</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="businessAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Account ID (Meta Business)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {type === "nao_oficial" && (
                  <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Depois de criar, abra a conta pra escanear o QR Code com o WhatsApp do celular
                    (Aparelhos conectados → Conectar um aparelho).
                  </p>
                )}

                <DialogFooter>
                  <Button type="submit" loading={createAccount.isPending}>
                    Criar conta
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        {!isLoading && accounts?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Smartphone className="mb-2 h-8 w-8 opacity-50" />
              Nenhuma conta WhatsApp cadastrada ainda
            </CardContent>
          </Card>
        )}
        {accounts?.map((account) => {
          const status = STATUS_LABEL[account.status];
          return (
            <Link key={account.id} href={`/whatsapp-accounts/${account.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  {account.type === "oficial" ? (
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {account.type === "oficial" ? "Oficial · Meta Cloud API" : "Não-oficial · QR Code (Inbox)"}
                  </p>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {account.oficial?.displayPhoneNumber && (
                    <p className="text-sm text-muted-foreground">{account.oficial.displayPhoneNumber}</p>
                  )}
                  {account.naoOficial?.connectedNumber && (
                    <p className="text-sm text-muted-foreground">+{account.naoOficial.connectedNumber}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
