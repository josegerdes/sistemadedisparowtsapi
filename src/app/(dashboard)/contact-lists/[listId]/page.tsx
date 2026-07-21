"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Upload, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { ContactListPublic, ContactPublic } from "@/app/(dashboard)/contact-lists/types";

const addContactSchema = z.object({
  phone: z.string().min(8, "Informe um telefone válido"),
  name: z.string().optional(),
});
type AddContactValues = z.infer<typeof addContactSchema>;

export default function ContactListDetailPage({ params }: { params: { listId: string } }) {
  const { listId } = params;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: lists } = useQuery<ContactListPublic[]>({
    queryKey: ["contact-lists"],
    queryFn: () => apiFetch("/api/contact-lists"),
  });
  const list = lists?.find((l) => l.id === listId);

  const { data: contacts, isLoading } = useQuery<ContactPublic[]>({
    queryKey: ["contact-lists", listId, "contacts"],
    queryFn: () => apiFetch(`/api/contact-lists/${listId}/contacts`),
  });

  const form = useForm<AddContactValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: { phone: "", name: "" },
  });

  const addContact = useMutation({
    mutationFn: (values: AddContactValues) =>
      apiFetch<ContactPublic>("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ ...values, listIds: [listId] }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists", listId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("Contato adicionado");
      setAddOpen(false);
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleOptOut = useMutation({
    mutationFn: (payload: { contactId: string; optedOut: boolean }) =>
      apiFetch<ContactPublic>(`/api/contacts/${payload.contactId}`, {
        method: "PATCH",
        body: JSON.stringify({ optedOut: payload.optedOut }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists", listId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeContact = useMutation({
    mutationFn: (contactId: string) => apiFetch(`/api/contacts/${contactId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists", listId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("Contato removido");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importCsv = useMutation({
    mutationFn: (csv: string) =>
      apiFetch<{ imported: number; skipped: number; total: number }>(`/api/contact-lists/${listId}/import`, {
        method: "POST",
        body: JSON.stringify({ csv }),
      }),
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists", listId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success(`${summary.imported} contato(s) importado(s), ${summary.skipped} ignorado(s)`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importCsv.mutate(String(reader.result ?? ""));
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{list?.name ?? "Lista"}</h1>
          <p className="text-sm text-muted-foreground">
            {list?.contactCount ?? 0} contato(s) · colunas do CSV: <code>phone</code>, <code>name</code> (o resto
            vira variável de template)
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" loading={importCsv.isPending} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Adicionar contato
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar contato</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit((values) => addContact.mutate(values))}>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="5511999999999" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" loading={addContact.isPending}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && contacts?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  <UserRound className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Nenhum contato nesta lista ainda
                </TableCell>
              </TableRow>
            )}
            {contacts?.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name ?? "—"}</TableCell>
                <TableCell>{contact.phone}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    title="Clique para alternar opt-out — contatos descadastrados nunca entram numa campanha"
                    onClick={() => toggleOptOut.mutate({ contactId: contact.id, optedOut: !contact.optedOut })}
                  >
                    <Badge variant={contact.optedOut ? "destructive" : "success"}>
                      {contact.optedOut ? "Descadastrado" : "Ativo"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Remover ${contact.name ?? contact.phone}?`)) removeContact.mutate(contact.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
