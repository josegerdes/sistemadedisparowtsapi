"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pause, Play, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import { CampaignPublic, CampaignRecipientPublic } from "@/app/(dashboard)/campaigns/types";
import { PaginatedResult } from "@/lib/pagination";

export default function CampaignDetailPage({ params }: { params: { campaignId: string } }) {
  const { campaignId } = params;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: campaigns } = useQuery<CampaignPublic[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch("/api/campaigns"),
    refetchInterval: 5000,
  });
  const campaign = campaigns?.find((c) => c.id === campaignId);

  const { data: recipients } = useQuery<PaginatedResult<CampaignRecipientPublic>>({
    queryKey: ["campaigns", campaignId, "recipients", page],
    queryFn: () => apiFetch(`/api/campaigns/${campaignId}/recipients?page=${page}&pageSize=25`),
    enabled: Boolean(campaign),
    refetchInterval: campaign?.status === "sending" ? 4000 : false,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  }

  const start = useMutation({
    mutationFn: () => apiFetch(`/api/campaigns/${campaignId}/start`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha iniciada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const pause = useMutation({
    mutationFn: () => apiFetch(`/api/campaigns/${campaignId}/pause`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha pausada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const cancel = useMutation({
    mutationFn: () => apiFetch(`/api/campaigns/${campaignId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha cancelada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!campaign) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const cards = [
    { label: "Na fila", value: campaign.totals.queued },
    { label: "Enviadas", value: campaign.totals.sent },
    { label: "Entregues", value: campaign.totals.delivered },
    { label: "Lidas", value: campaign.totals.read },
    { label: "Falhas", value: campaign.totals.failed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge>{campaign.status}</Badge>
            <span className="text-xs text-muted-foreground">{campaign.rateLimitPerMinute} msgs/min</span>
          </div>
        </div>
        <div className="flex gap-2">
          {(campaign.status === "draft" || campaign.status === "paused" || campaign.status === "scheduled") && (
            <Button loading={start.isPending} onClick={() => start.mutate()}>
              <Play className="h-4 w-4" />
              Iniciar
            </Button>
          )}
          {campaign.status === "sending" && (
            <Button variant="outline" loading={pause.isPending} onClick={() => pause.mutate()}>
              <Pause className="h-4 w-4" />
              Pausar
            </Button>
          )}
          {!["completed", "canceled", "failed"].includes(campaign.status) && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              loading={cancel.isPending}
              onClick={() => {
                if (confirm("Cancelar esta campanha?")) cancel.mutate();
              }}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients?.items.map((recipient) => (
              <TableRow key={recipient.id}>
                <TableCell>{recipient.phone}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      recipient.status === "failed"
                        ? "destructive"
                        : recipient.status === "read" || recipient.status === "delivered" || recipient.status === "sent"
                          ? "success"
                          : "outline"
                    }
                  >
                    {recipient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{recipient.error ?? "—"}</TableCell>
              </TableRow>
            ))}
            {recipients?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                  Nenhum destinatário ainda — inicie a campanha para materializar a lista.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {recipients && recipients.total > recipients.pageSize && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {Math.ceil(recipients.total / recipients.pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * recipients.pageSize >= recipients.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
