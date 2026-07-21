"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Cloud, Loader2, QrCode, Unplug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { AccountPublic } from "@/app/(dashboard)/whatsapp-accounts/types";

const STATUS_LABEL: Record<AccountPublic["status"], { label: string; variant: "success" | "outline" | "destructive" | "warning" }> = {
  connected: { label: "Conectada", variant: "success" },
  pending: { label: "Aguardando", variant: "warning" },
  disconnected: { label: "Desconectada", variant: "outline" },
  error: { label: "Erro", variant: "destructive" },
};

export default function WhatsappAccountDetailPage({ params }: { params: { accountId: string } }) {
  const { accountId } = params;
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery<AccountPublic[]>({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch("/api/whatsapp-accounts"),
  });
  const account = accounts?.find((a) => a.id === accountId);

  const verify = useMutation({
    mutationFn: () => apiFetch(`/api/whatsapp-accounts/${accountId}/oficial/verify`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      toast.success("Credenciais verificadas com a Meta");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const subscribe = useMutation({
    mutationFn: () => apiFetch(`/api/whatsapp-accounts/${accountId}/oficial/subscribe`, { method: "POST" }),
    onSuccess: () => toast.success("Webhook inscrito para esta conta"),
    onError: (error: Error) => toast.error(error.message),
  });

  if (!account) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {account.type === "oficial" ? "Oficial · Meta Cloud API" : "Não-oficial · QR Code (Inbox)"}
          </p>
        </div>
        <Badge variant={STATUS_LABEL[account.status].variant}>{STATUS_LABEL[account.status].label}</Badge>
      </div>

      {account.type === "oficial" && account.oficial && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4" /> Conexão Oficial
            </CardTitle>
            <CardDescription>Usada exclusivamente para templates e campanhas de disparo em massa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Access token" value={account.oficial.accessTokenMasked} />
            <Row label="Phone number ID" value={account.oficial.phoneNumberId} />
            <Row label="WABA ID" value={account.oficial.wabaId} />
            <Row label="Business Account ID" value={account.oficial.businessAccountId} />
            <Row label="Número" value={account.oficial.displayPhoneNumber ?? "—"} />
            <Row label="Tier de mensagens" value={account.oficial.tier} />
            <Row
              label="Última verificação"
              value={account.oficial.lastVerifiedAt ? new Date(account.oficial.lastVerifiedAt).toLocaleString("pt-BR") : "Nunca"}
            />
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" loading={verify.isPending} onClick={() => verify.mutate()}>
                <CheckCircle2 className="h-4 w-4" />
                Verificar credenciais
              </Button>
              <Button variant="outline" loading={subscribe.isPending} onClick={() => subscribe.mutate()}>
                Inscrever webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {account.type === "nao_oficial" && <NaoOficialPanel accountId={accountId} account={account} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function NaoOficialPanel({ accountId, account }: { accountId: string; account: AccountPublic }) {
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);

  const connect = useMutation({
    mutationFn: () => apiFetch(`/api/whatsapp-accounts/${accountId}/nao-oficial/connect`, { method: "POST" }),
    onSuccess: () => setPolling(true),
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnect = useMutation({
    mutationFn: () => apiFetch(`/api/whatsapp-accounts/${accountId}/nao-oficial/disconnect`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
      toast.success("Conta desconectada");
      setPolling(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { data: qrData } = useQuery<{ qr: string | null }>({
    queryKey: ["whatsapp-accounts", accountId, "qr"],
    queryFn: () => apiFetch(`/api/whatsapp-accounts/${accountId}/nao-oficial/qr`),
    enabled: polling || account.status === "pending",
    refetchInterval: (polling || account.status === "pending") ? 2500 : false,
  });

  useEffect(() => {
    if (account.status === "connected" || account.status === "disconnected") setPolling(false);
    if (account.status === "connected") queryClient.invalidateQueries({ queryKey: ["whatsapp-accounts"] });
  }, [account.status, queryClient]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4" /> Conexão via QR Code
        </CardTitle>
        <CardDescription>
          Usada exclusivamente para respostas manuais na Inbox — sem custo por conversa, mas sem
          suporte oficial da Meta (número sujeito a bloqueio se usado para disparo em massa).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {account.naoOficial?.connectedNumber && (
          <Row label="Número conectado" value={`+${account.naoOficial.connectedNumber}`} />
        )}

        {account.status !== "connected" && (
          <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/30 p-6">
            {qrData?.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrData.qr} alt="QR Code de pareamento" className="h-56 w-56 rounded-md bg-white p-2" />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-md border border-dashed">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="max-w-xs text-center text-xs text-muted-foreground">
              No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho, e escaneie o código.
            </p>
            <Button onClick={() => connect.mutate()} loading={connect.isPending}>
              {qrData?.qr ? "Gerar novo QR Code" : "Iniciar pareamento"}
            </Button>
          </div>
        )}

        {account.status === "connected" && (
          <Button variant="outline" className="text-destructive hover:text-destructive" loading={disconnect.isPending} onClick={() => disconnect.mutate()}>
            <Unplug className="h-4 w-4" />
            Desconectar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
