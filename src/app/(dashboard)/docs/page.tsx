import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    title: "1. Crie um App na Meta for Developers",
    body: "Em developers.facebook.com, crie um App do tipo Business e adicione o produto \"WhatsApp\". Anote o App ID e o App Secret (usados nas variáveis META_APP_ID e META_APP_SECRET do .env).",
  },
  {
    title: "2. Configure o webhook",
    body: "No painel do produto WhatsApp > Configuration, registre a URL https://SEU_DOMINIO/api/webhooks/meta como Callback URL e use o mesmo valor de META_WEBHOOK_VERIFY_TOKEN do .env como Verify Token. Inscreva os campos \"messages\" e \"message_template_status_update\".",
  },
  {
    title: "3. Gere um token permanente",
    body: "Crie um usuário de sistema (System User) no Meta Business Manager com acesso ao seu WhatsApp Business Account (WABA) e gere um token permanente com as permissões whatsapp_business_messaging e whatsapp_business_management.",
  },
  {
    title: "4. Cadastre a Conta WhatsApp Oficial no sistema",
    body: "Em Contas WhatsApp > Nova conta, escolha \"Oficial\" e informe o access token, o Phone Number ID, o WABA ID e o Business Account ID (todos disponíveis no painel da Meta). Depois, use os botões \"Verificar credenciais\" e \"Inscrever webhook\" na página da conta.",
  },
  {
    title: "5. (Opcional) Conecte um número via QR Code",
    body: "Para responder manualmente na Inbox sem pagar por conversa, cadastre uma conta \"Não-oficial\" e escaneie o QR Code com o WhatsApp do celular (Aparelhos conectados). Esse canal não deve ser usado para disparo em massa — risco de bloqueio do número.",
  },
  {
    title: "6. Crie um template e uma campanha",
    body: "Em Templates > Novo template, monte a mensagem (use {{1}}, {{2}}... para variáveis) e envie para aprovação da Meta. Depois de aprovado, crie uma lista de contatos (Contatos > Nova lista, com importação via CSV) e monte a campanha em Campanhas > Nova campanha.",
  },
];

export default function DocsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentação</h1>
        <p className="text-sm text-muted-foreground">Passo a passo para configurar o disparo em massa via WhatsApp Cloud API.</p>
      </div>
      <div className="space-y-4">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
