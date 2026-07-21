"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pause, Play, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { CampaignPublic } from "@/app/(dashboard)/campaigns/types";

const STATUS_VARIANT: Record<CampaignPublic["status"], "success" | "outline" | "destructive" | "warning" | "secondary" | "default"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  paused: "warning",
  completed: "success",
  failed: "destructive",
  canceled: "outline",
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useQuery<CampaignPublic[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch("/api/campaigns"),
    refetchInterval: 5000,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  }

  const start = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/campaigns/${id}/start`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha iniciada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const pause = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/campaigns/${id}/pause`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha pausada");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/campaigns/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      invalidate();
      toast.success("Campanha cancelada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Disparo em massa com templates aprovados.</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Send className="h-4 w-4" />
            Nova campanha
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enviadas</TableHead>
              <TableHead>Entregues</TableHead>
              <TableHead>Lidas</TableHead>
              <TableHead>Falhas</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && campaigns?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Nenhuma campanha criada ainda
                </TableCell>
              </TableRow>
            )}
            {campaigns?.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>
                  <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                    {campaign.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[campaign.status]}>{campaign.status}</Badge>
                </TableCell>
                <TableCell>{campaign.totals.sent}</TableCell>
                <TableCell>{campaign.totals.delivered}</TableCell>
                <TableCell>{campaign.totals.read}</TableCell>
                <TableCell>{campaign.totals.failed}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {(campaign.status === "draft" || campaign.status === "paused" || campaign.status === "scheduled") && (
                      <Button size="icon" variant="ghost" onClick={() => start.mutate(campaign.id)} title="Iniciar">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {campaign.status === "sending" && (
                      <Button size="icon" variant="ghost" onClick={() => pause.mutate(campaign.id)} title="Pausar">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {!["completed", "canceled", "failed"].includes(campaign.status) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Cancelar a campanha "${campaign.name}"?`)) cancel.mutate(campaign.id);
                        }}
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
