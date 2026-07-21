"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { AccountPublic } from "@/app/(dashboard)/whatsapp-accounts/types";
import { TemplatePublic } from "@/app/(dashboard)/templates/types";
import { ContactListPublic } from "@/app/(dashboard)/contact-lists/types";
import { CampaignPublic } from "@/app/(dashboard)/campaigns/types";

function extractVariables(components: TemplatePublic["components"]): string[] {
  const indexes = new Set<string>();
  for (const component of components) {
    const matches = component.text?.match(/\{\{(\d+)\}\}/g) ?? [];
    for (const m of matches) indexes.add(m.replace(/[{}]/g, ""));
  }
  return Array.from(indexes).sort((a, b) => Number(a) - Number(b));
}

export default function NewCampaignPage() {
  const router = useRouter();

  const [accountId, setAccountId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [listIds, setListIds] = useState<string[]>([]);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [scheduledFor, setScheduledFor] = useState("");
  const [mapping, setMapping] = useState<Record<string, { source: "field" | "literal"; value: string }>>({});

  const { data: accounts } = useQuery<AccountPublic[]>({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch("/api/whatsapp-accounts"),
  });
  const oficialAccounts = accounts?.filter((a) => a.type === "oficial") ?? [];

  const { data: templates } = useQuery<TemplatePublic[]>({
    queryKey: ["templates"],
    queryFn: () => apiFetch("/api/templates"),
  });
  const availableTemplates = templates?.filter((t) => t.accountId === accountId && t.status === "approved") ?? [];
  const selectedTemplate = templates?.find((t) => t.id === templateId) ?? null;
  const variables = useMemo(() => (selectedTemplate ? extractVariables(selectedTemplate.components) : []), [selectedTemplate]);

  const { data: lists } = useQuery<ContactListPublic[]>({
    queryKey: ["contact-lists"],
    queryFn: () => apiFetch("/api/contact-lists"),
  });

  const createCampaign = useMutation({
    mutationFn: () =>
      apiFetch<CampaignPublic>("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          templateId,
          name,
          listIds,
          adHocContactIds: [],
          variableMapping: mapping,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          rateLimitPerMinute,
        }),
      }),
    onSuccess: (campaign) => {
      toast.success("Campanha criada — inicie quando estiver pronto");
      router.push(`/campaigns/${campaign.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function toggleList(listId: string) {
    setListIds((prev) => (prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]));
  }

  const canSubmit = accountId && templateId && name && listIds.length > 0 && variables.every((v) => mapping[v]?.value);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova campanha</h1>
        <p className="text-sm text-muted-foreground">Escolha a conta, o template aprovado, as listas e o ritmo de envio.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Conta e template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da campanha</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Promoção de outubro" />
          </div>
          <div className="space-y-1.5">
            <Label>Conta WhatsApp (Oficial)</Label>
            <Select
              value={accountId}
              onValueChange={(value) => {
                setAccountId(value);
                setTemplateId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma conta" />
              </SelectTrigger>
              <SelectContent>
                {oficialAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Template aprovado</Label>
            <Select value={templateId} onValueChange={setTemplateId} disabled={!accountId}>
              <SelectTrigger>
                <SelectValue placeholder={accountId ? "Escolha um template" : "Escolha a conta primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accountId && availableTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum template aprovado nesta conta ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Destinatários</CardTitle>
          <CardDescription>Selecione uma ou mais listas de contatos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 rounded-md border p-2">
          {lists?.map((list) => (
            <label key={list.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
              <Checkbox checked={listIds.includes(list.id)} onCheckedChange={() => toggleList(list.id)} />
              <span className="text-sm">
                {list.name} <span className="text-muted-foreground">({list.contactCount})</span>
              </span>
            </label>
          ))}
          {lists?.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">Nenhuma lista criada ainda</p>}
        </CardContent>
      </Card>

      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Variáveis do template</CardTitle>
            <CardDescription>
              Para cada variável, use um campo do contato (<code>name</code>, <code>phone</code> ou uma coluna
              importada do CSV) ou um texto fixo igual para todo mundo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {variables.map((v) => (
              <div key={v} className="flex items-end gap-2 rounded-md border p-3">
                <span className="pb-2 text-sm font-medium">{`{{${v}}}`}</span>
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select
                    value={mapping[v]?.source ?? "field"}
                    onValueChange={(source) =>
                      setMapping((prev) => ({ ...prev, [v]: { source: source as "field" | "literal", value: prev[v]?.value ?? "" } }))
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field">Campo do contato</SelectItem>
                      <SelectItem value="literal">Texto fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>{mapping[v]?.source === "literal" ? "Texto" : "Nome do campo"}</Label>
                  <Input
                    placeholder={mapping[v]?.source === "literal" ? "Texto fixo" : "name, phone ou coluna do CSV"}
                    value={mapping[v]?.value ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [v]: { source: prev[v]?.source ?? "field", value: e.target.value } }))
                    }
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Envio</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Limite de mensagens por minuto</Label>
            <Input
              type="number"
              min={1}
              value={rateLimitPerMinute}
              onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Agendar para (opcional)</Label>
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/campaigns")}>
          Cancelar
        </Button>
        <Button disabled={!canSubmit} loading={createCampaign.isPending} onClick={() => createCampaign.mutate()}>
          Criar campanha
        </Button>
      </div>
    </div>
  );
}
