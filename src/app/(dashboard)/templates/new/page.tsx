"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { AccountPublic } from "@/app/(dashboard)/whatsapp-accounts/types";
import { TemplatePublic } from "@/app/(dashboard)/templates/types";

const formSchema = z.object({
  accountId: z.string().min(1, "Escolha a conta"),
  name: z
    .string()
    .min(2)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string().min(2),
  hasHeader: z.boolean(),
  headerText: z.string().optional(),
  bodyText: z.string().min(1, "Escreva o corpo da mensagem"),
  hasFooter: z.boolean(),
  footerText: z.string().optional(),
  buttons: z.array(
    z.object({
      type: z.enum(["QUICK_REPLY", "URL"]),
      text: z.string().min(1),
      url: z.string().optional(),
    })
  ),
});
type FormValues = z.infer<typeof formSchema>;

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, ""))));
}

export default function NewTemplatePage() {
  const router = useRouter();

  const { data: accounts } = useQuery<AccountPublic[]>({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch("/api/whatsapp-accounts"),
  });
  const oficialAccounts = accounts?.filter((a) => a.type === "oficial") ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      name: "",
      category: "MARKETING",
      language: "pt_BR",
      hasHeader: false,
      headerText: "",
      bodyText: "",
      hasFooter: false,
      footerText: "",
      buttons: [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "buttons" });
  const bodyText = form.watch("bodyText");
  const variables = extractVariables(bodyText ?? "");

  const createTemplate = useMutation({
    mutationFn: (values: FormValues) => {
      const components = [
        ...(values.hasHeader && values.headerText
          ? [{ type: "HEADER" as const, format: "TEXT" as const, text: values.headerText }]
          : []),
        { type: "BODY" as const, text: values.bodyText },
        ...(values.hasFooter && values.footerText ? [{ type: "FOOTER" as const, text: values.footerText }] : []),
        ...(values.buttons.length
          ? [
              {
                type: "BUTTONS" as const,
                buttons: values.buttons.map((b) => ({
                  type: b.type,
                  text: b.text,
                  ...(b.type === "URL" ? { url: b.url } : {}),
                })),
              },
            ]
          : []),
      ];
      const variableSamples = Object.fromEntries(variables.map((v) => [v, `exemplo${v}`]));

      return apiFetch<TemplatePublic>("/api/templates", {
        method: "POST",
        body: JSON.stringify({ accountId: values.accountId, name: values.name, category: values.category, language: values.language, components, variableSamples }),
      });
    },
    onSuccess: () => {
      toast.success("Template enviado para aprovação da Meta");
      router.push("/templates");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo template</h1>
        <p className="text-sm text-muted-foreground">
          Enviado direto pra aprovação da Meta — normalmente leva de minutos a algumas horas
          para aprovar. Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>... no corpo para variáveis.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit((values) => createTemplate.mutate(values))}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta WhatsApp (Oficial)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma conta Oficial" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {oficialAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {oficialAccounts.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma conta Oficial cadastrada — cadastre uma em Contas WhatsApp primeiro.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do template</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: boas_vindas_promocao" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="UTILITY">Utilidade</SelectItem>
                          <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Idioma</FormLabel>
                      <FormControl>
                        <Input placeholder="pt_BR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conteúdo</CardTitle>
              <CardDescription>Cabeçalho e rodapé são opcionais; o corpo é obrigatório.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasHeader"
                render={({ field }) => (
                  <label className="flex items-center gap-2">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">Incluir cabeçalho (texto)</span>
                  </label>
                )}
              />
              {form.watch("hasHeader") && (
                <FormField
                  control={form.control}
                  name="headerText"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Título curto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="bodyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corpo da mensagem</FormLabel>
                    <FormControl>
                      <Textarea rows={5} placeholder="Olá {{1}}, sua encomenda chegou..." {...field} />
                    </FormControl>
                    {variables.length > 0 && (
                      <p className="text-xs text-muted-foreground">Variáveis detectadas: {variables.join(", ")}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasFooter"
                render={({ field }) => (
                  <label className="flex items-center gap-2">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    <span className="text-sm">Incluir rodapé</span>
                  </label>
                )}
              />
              {form.watch("hasFooter") && (
                <FormField
                  control={form.control}
                  name="footerText"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Texto pequeno no final" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Botões (opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2 rounded-md border p-3">
                  <div className="flex-1 space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={form.watch(`buttons.${index}.type`)}
                      onValueChange={(value) => form.setValue(`buttons.${index}.type`, value as "QUICK_REPLY" | "URL")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Resposta rápida</SelectItem>
                        <SelectItem value="URL">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Texto</Label>
                    <Input {...form.register(`buttons.${index}.text`)} />
                  </div>
                  {form.watch(`buttons.${index}.type`) === "URL" && (
                    <div className="flex-1 space-y-1.5">
                      <Label>URL</Label>
                      <Input {...form.register(`buttons.${index}.url`)} placeholder="https://..." />
                    </div>
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ type: "QUICK_REPLY", text: "", url: "" })}
              >
                <Plus className="h-4 w-4" />
                Adicionar botão
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/templates")}>
              Cancelar
            </Button>
            <Button type="submit" loading={createTemplate.isPending}>
              Enviar para aprovação
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
