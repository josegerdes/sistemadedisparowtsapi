"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareText, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { TemplatePublic } from "@/app/(dashboard)/templates/types";

const STATUS_VARIANT: Record<TemplatePublic["status"], "success" | "outline" | "destructive" | "warning" | "secondary"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  paused: "outline",
  disabled: "outline",
  draft: "secondary",
};

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery<TemplatePublic[]>({
    queryKey: ["templates"],
    queryFn: () => apiFetch("/api/templates"),
  });

  const sync = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/templates/${id}/sync`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Status sincronizado com a Meta");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Templates de mensagem enviados pra aprovação da Meta — só templates aprovados podem
            ser usados em campanhas de disparo em massa.
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="h-4 w-4" />
            Novo template
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && templates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <MessageSquareText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Nenhum template criado ainda
                </TableCell>
              </TableRow>
            )}
            {templates?.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>{template.category}</TableCell>
                <TableCell>{template.language}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={STATUS_VARIANT[template.status]} className="w-fit">
                      {template.status}
                    </Badge>
                    {template.status === "rejected" && template.rejectedReason && (
                      <span className="text-xs text-muted-foreground">{template.rejectedReason}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => sync.mutate(template.id)} title="Sincronizar status">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Remover o template "${template.name}"?`)) remove.mutate(template.id);
                      }}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
