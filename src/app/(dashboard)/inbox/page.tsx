"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cloud, MessageCircle, QrCode, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { ConversationPublic, MessagePublic } from "@/app/(dashboard)/inbox/types";

function windowLabel(windowExpiresAt: string | null): { label: string; expired: boolean } | null {
  if (!windowExpiresAt) return null;
  const diff = new Date(windowExpiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Janela de 24h expirada", expired: true };
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { label: `Janela expira em ${hours}h${minutes}m`, expired: false };
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading } = useQuery<ConversationPublic[]>({
    queryKey: ["inbox", "conversations"],
    queryFn: () => apiFetch("/api/inbox/conversations"),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!selectedId && conversations?.length) setSelectedId(conversations[0]?.id ?? null);
  }, [conversations, selectedId]);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  const { data: messages } = useQuery<MessagePublic[]>({
    queryKey: ["inbox", "messages", selectedId],
    queryFn: () => apiFetch(`/api/inbox/conversations/${selectedId}/messages`),
    enabled: Boolean(selectedId),
    refetchInterval: 5_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/api/inbox/conversations/${selectedId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["inbox", "messages", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["inbox", "conversations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const window_ = selected ? windowLabel(selected.windowExpiresAt) : null;
  const canReply = selected?.channelType === "nao_oficial" || !window_?.expired;

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col rounded-lg border bg-card">
        <div className="border-b px-3 py-2 text-sm font-medium">Conversas</div>
        <ScrollArea className="flex-1">
          {isLoading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && conversations?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageCircle className="mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma conversa ainda</p>
            </div>
          )}
          {conversations?.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={cn(
                "flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left hover:bg-accent",
                conversation.id === selectedId && "bg-accent"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {conversation.contactName ?? conversation.contactPhone}
                </span>
                {conversation.unreadCount > 0 && (
                  <Badge variant="default" className="h-5 min-w-5 justify-center px-1">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground">{conversation.lastMessagePreview}</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {conversation.channelType === "oficial" ? (
                  <Cloud className="h-3 w-3" />
                ) : (
                  <QrCode className="h-3 w-3" />
                )}
                {conversation.channelType === "oficial" ? "Oficial" : "Não-oficial"}
              </span>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex flex-col rounded-lg border bg-card">
        {!selected && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Selecione uma conversa
          </div>
        )}
        {selected && (
          <>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="font-medium">{selected.contactName ?? selected.contactPhone}</p>
                <p className="text-xs text-muted-foreground">{selected.contactPhone}</p>
              </div>
              {selected.channelType === "oficial" && window_ && (
                <Badge variant={window_.expired ? "destructive" : "outline"}>{window_.label}</Badge>
              )}
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages?.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                        message.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <p>{message.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {message.direction === "outbound" && ` · ${message.status}`}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.trim()) sendReply.mutate(draft.trim());
              }}
            >
              <Input
                placeholder={canReply ? "Digite uma mensagem..." : "Janela de 24h expirada — use uma campanha"}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={!canReply}
              />
              <Button type="submit" size="icon" disabled={!canReply || !draft.trim()} loading={sendReply.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
