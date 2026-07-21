"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCheck, MessageCircle, Send, Smartphone } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";

interface DashboardSummary {
  accountsConnected: number;
  accountsTotal: number;
  campaignsActive: number;
  templatesPending: number;
  conversationsUnread: number;
  messages: { sent: number; delivered: number; read: number; failed: number };
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard"),
    refetchInterval: 10_000,
  });

  const cards = [
    {
      title: "Contas WhatsApp",
      icon: Smartphone,
      value: data ? `${data.accountsConnected}/${data.accountsTotal}` : "—",
      description: "Conectadas / total",
    },
    {
      title: "Campanhas ativas",
      icon: Send,
      value: data?.campaignsActive ?? "—",
      description: "Em envio ou agendadas",
    },
    {
      title: "Conversas na Inbox",
      icon: MessageCircle,
      value: data?.conversationsUnread ?? "—",
      description: "Não lidas",
    },
    {
      title: "Templates pendentes",
      icon: CheckCheck,
      value: data?.templatesPending ?? "—",
      description: "Aguardando aprovação da Meta",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do disparo em massa e da Inbox no WhatsApp.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{card.value}</div>}
              <CardDescription>{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagens (todas as campanhas)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Enviadas", value: data?.messages.sent },
            { label: "Entregues", value: data?.messages.delivered },
            { label: "Lidas", value: data?.messages.read },
            { label: "Falhas", value: data?.messages.failed },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : (item.value ?? 0)}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
