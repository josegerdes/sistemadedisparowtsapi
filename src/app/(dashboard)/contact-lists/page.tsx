"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Contact, Plus } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { ContactListPublic } from "@/app/(dashboard)/contact-lists/types";

const createListSchema = z.object({
  name: z.string().min(2, "Informe um nome"),
  description: z.string().optional(),
});
type CreateListValues = z.infer<typeof createListSchema>;

export default function ContactListsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: lists, isLoading } = useQuery<ContactListPublic[]>({
    queryKey: ["contact-lists"],
    queryFn: () => apiFetch("/api/contact-lists"),
  });

  const form = useForm<CreateListValues>({
    resolver: zodResolver(createListSchema),
    defaultValues: { name: "", description: "" },
  });

  const createList = useMutation({
    mutationFn: (values: CreateListValues) =>
      apiFetch<ContactListPublic>("/api/contact-lists", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      toast.success("Lista criada");
      setCreateOpen(false);
      form.reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Organize seus contatos em listas para usar nas campanhas.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nova lista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova lista de contatos</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit((values) => createList.mutate(values))}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Clientes ativos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" loading={createList.isPending}>
                    Criar lista
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        {!isLoading && lists?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Contact className="mb-2 h-8 w-8 opacity-50" />
              Nenhuma lista criada ainda
            </CardContent>
          </Card>
        )}
        {lists?.map((list) => (
          <Link key={list.id} href={`/contact-lists/${list.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <CardTitle className="text-base">{list.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{list.contactCount}</p>
                <p className="text-xs text-muted-foreground">contatos</p>
                {list.description && <p className="mt-2 text-sm text-muted-foreground">{list.description}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
