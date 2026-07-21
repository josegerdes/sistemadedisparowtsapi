# Sistema de Disparo WhatsApp

Sistema multiusuário de disparo em massa e Inbox via WhatsApp, com dois canais por conta:

- **Oficial** (Meta Cloud API) — obrigatório para campanhas de disparo em massa com template aprovado.
- **Não-oficial** (sessão WhatsApp Web via QR Code, [Baileys](https://github.com/WhiskeySockets/Baileys)) — só para respostas manuais na Inbox, sem custo por conversa.

Stack: Next.js 14 (App Router) + TypeScript + MongoDB (driver nativo) + shadcn/ui, autenticação por JWT em cookie httpOnly e RBAC com múltiplas roles por usuário (estilo Discord — permissões por categoria, hierarquia por posição).

## Rodando localmente com Docker

1. Copie `.env.example` para `.env` e preencha os valores (senhas, `JWT_SECRET`, `APP_SECRET`, credenciais do App da Meta).
2. `docker compose up --build`
3. O admin inicial é criado automaticamente no boot (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` do `.env`) — troque a senha no primeiro login.

## Rodando localmente sem Docker

```bash
npm install
# defina DATABASE_URL no .env apontando pra um Mongo local, além das outras variáveis
npm run seed   # cria o admin inicial (idempotente)
npm run dev
```

## Configuração da Meta Cloud API

Veja a página **Documentação** dentro do sistema (`/docs`) para o passo a passo completo: criar o App, configurar o webhook, gerar um token permanente e cadastrar a primeira Conta WhatsApp Oficial.

## Arquitetura

- `src/server/auth/` — JWT, bcrypt, sessão (reavaliada a cada request contra o banco, não confia em claims do token).
- `src/server/rbac/permissions.ts` — catálogo de permissões por categoria.
- `src/server/db/` — cliente Mongo (singleton lazy), schema, coleções tipadas, seed do admin.
- `src/server/modules/<nome>/{repository,service,types}.ts` — um módulo por entidade (users, roles, whatsapp-accounts, templates, contacts, contact-lists, campaigns, inbox, dashboard).
- `src/server/whatsapp/` — cliente da Graph API da Meta, gerenciador de conexões Baileys e o adaptador de sessão do Baileys sobre o Mongo.
- `src/server/jobs/` — fila de jobs baseada no Mongo (sem Redis/worker externo), com handlers para webhook da Meta, sincronização de templates e envio de campanhas com limite de taxa.
- `src/app/api/` — rotas de API, todas passando por `withApiHandler` (autenticação, permissão, formato de erro padronizado).
- `src/app/(dashboard)/` — páginas autenticadas; `src/app/(auth)/login` — login.

## Limitações conhecidas

- Docker não foi testado neste ambiente de desenvolvimento (sem `docker` CLI disponível) — só `next build`/`next dev` foram verificados. Teste `docker compose up` antes de ir pra produção.
- Canal Não-oficial (Baileys) roda no mesmo processo do `app` — um redeploy derruba todas as sessões simultaneamente (reconectam sozinhas a partir do estado persistido, sem precisar de novo QR Code, exceto se a sessão tiver sido invalidada pelo próprio WhatsApp).
- Mensagens de mídia (imagem/documento) na Inbox ainda não são suportadas — só texto.
