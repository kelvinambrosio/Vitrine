# Minha Vitrine: guia para humanos e agentes

Marketplace brasileiro: qualquer pessoa abre uma loja grátis e vende para o Brasil. A plataforma cobra **5% sobre o valor dos produtos** (sem o frete) de cada venda concluída, sem mensalidade. Todo agente lê este arquivo antes de qualquer tarefa. O plano de trabalho está em `docs/PLANO.md`; o passo a passo de publicação, em `GUIA.md`.

## 1. Arquitetura

- **Next.js 15 (App Router) + TypeScript + Tailwind 4.** Páginas são Server Components; formulários usam Server Actions (`"use server"`); só usamos `"use client"` quando há interatividade (carrinho, upload de imagem).
- **Supabase:** Postgres com RLS (segurança por linha), Auth (e-mail e senha) e Storage (bucket público `produtos`). Esquema em `supabase/schema.sql`.
- **Mercado Pago:** split 1:1 de marketplace. Cada vendedor conecta a própria conta (OAuth). O checkout envia `marketplace_fee` (nossos 5%) e o Mercado Pago divide o pagamento sozinho. O dinheiro nunca passa por nós.
- **Hospedagem:** Vercel (com `vercel.json` para o cron diário).

```
src/
  app/                      rotas (cada pasta = uma URL)
    page.tsx, busca/, produto/[id]/, loja/[slug]/, carrinho/   vitrine pública
    entrar/, esqueci-senha/, redefinir-senha/, auth/callback/   autenticação
    conta/, pedidos/                                             área do comprador
    painel/                                                      área do vendedor
    admin/                                                       área do administrador
    vender/, ajuda/, termos/, privacidade/                       páginas institucionais
    api/checkout, api/webhooks/mercadopago, api/mp/{connect,callback},
    api/conta/exportar, api/cron/limpar-pedidos                  rotas de API
  components/               componentes compartilhados (Header, ProductCard, CartView, ImageInput...)
  lib/                      regras de negócio e utilitários (veja abaixo)
  middleware.ts             renova a sessão do Supabase
supabase/schema.sql         banco completo (primeira instalação)
```

`src/lib/`: `config.ts` (variáveis), `format.ts` (dinheiro, slug, rótulos), `commission.ts` (comissão), `mp.ts` (token e reembolso Mercado Pago), `orders.ts` (reembolso e estoque), `notify.ts` (avisos e previsão de entrega), `auth.ts` (`requireUser`, `requireAdmin`, `safeNext`), `cart.ts` (carrinho no navegador), `upload.ts`, `supabase/{server,admin,middleware}.ts`.

### Fluxo do pedido
1. Carrinho (navegador) → `POST /api/checkout`: o servidor **recalcula tudo** a partir do banco, cria o pedido `pending` e a preferência no Mercado Pago com a conta do vendedor.
2. Mercado Pago avisa em `/api/webhooks/mercadopago`; o servidor **consulta a API** do Mercado Pago, confere valor e referência e só então marca `paid`, baixa o estoque, cria o evento e avisa o comprador.
3. O vendedor registra cada etapa em `/painel` (`order_events`); o comprador acompanha em `/pedidos/[id]`.
4. Reembolso: `lib/orders.ts` (`refundOrder`, `markRefunded`) devolve o estoque uma única vez.

## 2. Regras inegociáveis

**Segredos e dados pessoais**
- Nunca imprimir, commitar, logar ou colar senhas, tokens, chaves de API ou dados pessoais (e-mail, endereço, CPF) em código, testes, mensagens de commit, relatórios ou respostas. Use dados fictícios em exemplos e testes.
- Não ler `.env.local` nem arquivos de produção. Variáveis novas entram só em `.env.example` (sem valor) e no `GUIA.md`.
- `SUPABASE_SERVICE_ROLE_KEY` e tokens do Mercado Pago só em código de servidor. Nada com `NEXT_PUBLIC_` pode ser secreto.

**Produção**
- Não publicar, não fazer deploy, não rodar SQL em banco de produção, não executar ações em contas reais e não alterar dados reais sem autorização explícita do dono do projeto. `git push` e comandos de Vercel/Supabase exigem confirmação (ver `.claude/settings.json`).

**Segurança do código**
- **Nunca confiar no navegador:** preço, estoque, frete, comissão e status do pedido são sempre calculados e validados no servidor.
- Todo Server Action e rota de API começa verificando quem é o usuário (`requireUser`, `requireAdmin`) e se ele é dono do recurso. Exceções públicas, cada uma com a sua própria proteção: login, cadastro e recuperação de senha (`entrar/actions.ts`), o webhook do Mercado Pago (assinatura e consulta à API), o cron (`CRON_SECRET`) e o callback do Supabase (troca de código).
- `createAdminClient()` ignora a RLS. Só no servidor, depois de checar usuário e permissão, e com o filtro mais estreito possível.
- Redirecionamentos recebidos do usuário passam por `safeNext`. Uploads: só JPG/PNG/WEBP, 4 MB.
- Pagamento só vira "pago" depois da consulta à API do Mercado Pago. Dinheiro é sempre inteiro em **centavos**; formatar só na exibição (`formatBRL`).
- Mudou tabela ou política RLS? Atualize `supabase/schema.sql` **e**, depois que o banco de produção existir, crie uma migração nova em `supabase/migrations/NNNN_nome.sql` (nunca edite SQL já aplicado).

**Mudanças de código**
- Não apagar nem reescrever arquivos existentes sem necessidade. Preferir edições pequenas e localizadas. Não adicionar dependências sem justificar no resumo.

## 3. Padrões de código

- TypeScript estrito; sem `any` (use `unknown` e estreite). Importar com o alias `@/`.
- Textos da interface em português do Brasil; identificadores de código em inglês; colunas do banco em inglês com `snake_case`.
- Server Actions retornam via `redirect(...?erro=|ok=)` e exibem com `<Flash>`; rotas de API retornam `NextResponse.json({ error })` com status HTTP correto.
- Tailwind com as cores do tema (`brand`, `accent`). Acessibilidade: `label` em todo campo, `alt` em imagens, contraste, foco visível, navegação por teclado; mobile primeiro.
- Funções de regra de negócio ficam em `src/lib/` (testáveis); páginas e rotas só orquestram.
- Mensagens de erro ao usuário nunca revelam detalhes internos nem se uma conta existe.

## 4. Comandos

| O que | Comando |
|---|---|
| Instalar | `npm install` |
| Rodar local | `npm run dev` (http://localhost:3000) |
| Checar tipos | `npx tsc --noEmit` |
| Build de produção | `npm run build` |
| Testes | `npm test` (**ainda não existe**; a Fase 0 do `docs/PLANO.md` adiciona Vitest) |

Enquanto os testes não existirem, "concluído" exige `npx tsc --noEmit` e `npm run build` sem erros, mais a revisão do `qa-auditor`.

## 5. Equipe de agentes (`.claude/agents/`)

| Agente | Responsabilidade | Dono destes arquivos |
|---|---|---|
| `project-manager` | Divide o trabalho, mapeia dependências e arquivos, decide o que roda em paralelo e em qual worktree, revisa a integração final. Escreve só em `docs/` e `CLAUDE.md`. | `docs/**`, `CLAUDE.md` |
| `frontend-developer` | Páginas, componentes, responsividade, acessibilidade. | `src/components/**`, `src/app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`, `robots.ts`, `sitemap.ts` |
| `backend-developer` | APIs, regras de negócio, integrações (Mercado Pago, e-mail, frete), Server Actions de loja, produtos e pedidos. | `src/app/api/**` (exceto `api/conta`), `src/app/{painel,pedidos,admin,produto}/**/actions.ts`, `src/lib/**` (exceto `auth.ts`, `supabase/{server,middleware}.ts`), `supabase/**`, e a configuração da raiz (`next.config.mjs`, `vercel.json`, `tsconfig.json`, `package.json`, `.env.example`, `GUIA.md`) |
| `account-manager` | Implementação técnica de usuários, perfis, autenticação e permissões. Nunca acessa contas reais nem faz ações administrativas em produção. | `src/app/{entrar,esqueci-senha,redefinir-senha,auth,conta}/**`, `src/app/api/conta/**`, `src/app/admin/usuarios/**`, `src/lib/auth.ts`, `src/middleware.ts`, `src/lib/supabase/{server,middleware}.ts`, e as políticas de `profiles` no SQL |
| `qa-auditor` | Verifica erros, roda tipos/build/testes, revisa alterações. **Somente leitura**, exceto quando o dono do projeto autorizar correções (ver item 6 da seção 6). | nenhum (com autorização, só os arquivos listados nela) |
| `security-auditor` | Revisa autenticação, permissões, exposição de dados e vulnerabilidades. **Somente leitura.** | nenhum |

**Desempate de donos:** quando um arquivo casa com mais de um padrão, vale o dono mais específico. Por isso as pastas do `account-manager` (inclusive os `page.tsx` de `entrar/`, `conta/`, `esqueci-senha/`, `redefinir-senha/` e `admin/usuarios/`) são dele por inteiro, e o `frontend-developer` pede a ele qualquer mudança de tela ali, definindo o contrato antes. `actions.ts` é sempre do backend (ou do `account-manager`, nas pastas dele).

**Zonas de conflito** (um agente por vez, em série): `supabase/schema.sql`, `package.json` e lockfile, `src/app/painel/page.tsx` e `painel/actions.ts`, `src/app/layout.tsx`, `src/components/Header.tsx`, `src/lib/format.ts`.

## 6. Como trabalhar em equipe

O **agente principal** (a sessão que conversa com o dono do projeto) é o orquestrador. Subagentes não chamam outros subagentes, então quem delega, junta e resolve conflitos é o agente principal. O `project-manager` produz o plano e a revisão; se a sua versão do Claude Code permitir, ele também pode ser usado como agente principal (`claude --agent project-manager`).

1. **Antes de mexer no código:** o responsável lista os arquivos que vai tocar e quem importa cada um (`grep -rn "from \"@/lib/x\""`), e confere a tabela de donos acima.
2. **Paralelo só quando seguro:** tarefas com conjuntos de arquivos disjuntos e sem dependência de contrato podem rodar juntas. Defina antes o contrato entre elas (tipos, assinatura de função, formato da resposta).
3. **Sem edição simultânea no mesmo arquivo.** Se dois agentes precisarem do mesmo arquivo, rode em série ou isole cada um em um **Git worktree** (no Agent tool, `isolation: "worktree"`; manualmente, `git worktree add ../vitrine-<tarefa> -b feat/<tarefa>`). Uma branch por tarefa: `feat/`, `fix/`, `chore/`.
4. **Ordem de uma funcionalidade:** (1) banco/contrato → (2) regra de negócio e API → (3) interface → (4) testes → (5) `qa-auditor` → (6) `security-auditor` (obrigatório se mexeu em auth, dinheiro, permissões, uploads ou dados pessoais) → (7) correções → (8) integração.
5. **Integração:** o agente principal faz o merge das branches, resolve conflitos, roda `npx tsc --noEmit` e `npm run build` (e `npm test` quando existir) e apresenta ao dono um **resumo**: o que mudou, arquivos, riscos, o que foi testado e o que depende dele.
6. **Auditores só leem.** Eles reportam; quem corrige é o desenvolvedor dono do arquivo, e só quando o dono do projeto autorizar as correções. Única exceção: o `qa-auditor` pode editar quando a tarefa delegada trouxer a marcação literal `CORREÇÕES AUTORIZADAS PELO DONO:` seguida da lista de arquivos; ele edita só esses arquivos, em série (nunca ao mesmo tempo que o dono do arquivo) e lista cada mudança. O `security-auditor` nunca edita.
7. **Commits e push** só quando o dono pedir. Mensagens de commit descrevem o porquê e nunca contêm segredos.

## 7. Definição de "concluído"

Uma funcionalidade só está concluída quando: o código compila (tipos e build); os testes passam; o `qa-auditor` não reportou problema aberto; o `security-auditor` revisou (nos casos do item 4); `.env.example`, `GUIA.md` e `supabase/` estão atualizados; e o resumo foi entregue ao dono do projeto.
