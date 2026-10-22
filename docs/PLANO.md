# Plano de implementação: equipe de agentes da Minha Vitrine

Este plano parte da análise do código atual (commit `83c8904`). Ele diz o que existe, onde estão os riscos, em que ordem trabalhar, quem faz o quê e o que pode rodar em paralelo. Regras gerais, donos de arquivos e padrões estão no `CLAUDE.md`.

## 1. Retrato do projeto

| Área | Arquivos | Linhas |
|---|---|---|
| `src/app` (rotas, páginas, ações) | 40 | ~2.800 |
| `src/components` | 10 | ~570 |
| `src/lib` (regras de negócio) | 12 | ~415 |
| `supabase/schema.sql` | 1 | ~325 |

- 27 rotas (páginas e APIs), 6 arquivos de Server Actions, 6 rotas de API.
- **Nunca foi compilado.** Só passou por checagem de sintaxe. Não há `node_modules`, nem lockfile, nem testes (`npm test` não existe).
- O banco ainda não foi criado em nenhum ambiente. Não há migrações, só o `schema.sql` de primeira instalação.

## 2. Mapa de dependências (o que mexe em quê)

Quantos arquivos importam cada módulo. Quanto maior o número, maior o cuidado ao alterar.

| Módulo | Importado por | Observação |
|---|---|---|
| `lib/auth.ts` | 17 | Alterar a assinatura de `requireUser`/`requireAdmin` quebra quase todas as áreas |
| `lib/supabase/admin.ts` | 16 | Ignora a RLS. Cada uso precisa de verificação prévia de usuário e dono |
| `lib/config.ts` | 14 | Variáveis de ambiente |
| `lib/format.ts` | 11 | Dinheiro, slug, rótulos de status |
| `lib/supabase/server.ts` | 11 | Cliente do usuário (respeita a RLS) |
| `lib/notify.ts` | 6 | Avisos e previsão de entrega |
| `lib/mp.ts`, `lib/orders.ts`, `lib/cart.ts`, `lib/commission.ts` | 2 a 3 cada | Núcleo do dinheiro: mudou aqui, passa por auditoria de segurança |

**Zonas de conflito** (um agente por vez, em série): `supabase/schema.sql`, `package.json` e lockfile, `painel/page.tsx` e `painel/actions.ts`, `layout.tsx`, `Header.tsx`, `lib/format.ts`.

## 3. Pontos de atenção encontrados na análise

Ordenados por gravidade. São achados de leitura de código, ainda não confirmados por auditoria nem por teste.

1. **Webhook do Mercado Pago aceita notificações sem assinatura** quando `MP_WEBHOOK_SECRET` não está definida. O valor é conferido na API, o que reduz o risco, mas em produção a assinatura deve ser obrigatória.
2. **Tokens do Mercado Pago dos vendedores ficam em texto puro** na tabela `store_payment_accounts` (protegida por RLS sem política, só o servidor lê). Avaliar criptografia em nível de coluna ou Supabase Vault.
3. **Sem limitação de tentativas** nas rotas próprias (`/api/checkout`, denúncias, exportação de dados). Há só um limite de pedidos pendentes por hora.
4. **Estoque só baixa no pagamento**, então dois compradores podem pagar a última unidade. O sistema avisa em `notes`, mas não resolve sozinho.
5. **`createAdminClient()` em 16 arquivos**, inclusive em páginas de leitura (`painel/page.tsx` só para saber se há conta do Mercado Pago). Reduzir ao mínimo necessário.
6. **4 usos de `as never`** em componentes de produto (atalho de tipo). Trocar por tipos reais.
7. **ESLint desativado no build** (`ignoreDuringBuilds`). Ligar depois do primeiro build limpo.
8. **Sem testes.** A regra de dinheiro (`commission`, `format`, previsão de entrega, `safeNext`) é a primeira candidata.
9. **Sem migrações.** Qualquer mudança no banco depois do primeiro deploy exige migração versionada.

## 4. Plano por fases

Legenda: **P** = pode rodar em paralelo com outra tarefa da mesma fase; **S** = em série. Responsáveis são os agentes de `.claude/agents/`; o agente principal integra tudo.

### Fase 0: Fundação de qualidade (S)
- **Objetivo:** primeiro build limpo e rede de segurança mínima.
- **Passos:** `npm install` → `npx tsc --noEmit` → `npm run build`; corrigir erros de compilação (cada dono no seu arquivo); adicionar Vitest e script `npm test`; testes para `lib/format.ts`, `lib/commission.ts`, `estimateDelivery` em `lib/notify.ts` e `safeNext` em `lib/auth.ts`.
- **Quem:** `backend-developer` (testes e `package.json`), donos dos arquivos para os erros de tipo; `qa-auditor` confere.
- **Saída:** tipos, build e testes passando.
- **Por que em série:** mexe em `package.json` e no lockfile.

### Fase 1: Auditoria inicial (P entre si, somente leitura)
- `qa-auditor`: fluxos de ponta a ponta lidos no código (carrinho → checkout → webhook → rastreio → reembolso), consistência entre `schema.sql` e as consultas, acessibilidade básica.
- `security-auditor`: política de cada tabela, uso de `createAdminClient`, IDOR (acesso a recurso de outro usuário), assinatura do webhook, uploads, redirecionamentos, exposição de dados pessoais, itens da seção 3.
- **Saída:** relatórios em `docs/auditorias/AAAA-MM-DD-<agente>.md` com severidade, arquivo e linha. Nada é corrigido nesta fase.

### Fase 2: Correções priorizadas (P por área, com worktrees)
Cada dono corrige o que o relatório apontou nos seus arquivos. Áreas disjuntas rodam juntas, cada uma em uma branch/worktree:
- `backend-developer`: assinatura obrigatória do webhook em produção, criptografia de tokens, limitação de tentativas, redução do uso de `createAdminClient` (arquivos de `lib/` e `api/`).
- `account-manager`: endurecer autenticação e permissões (`auth.ts`, `entrar/`, `conta/`, `admin/usuarios/`, políticas de `profiles`).
- `frontend-developer`: remover `as never`, acessibilidade, ligar ESLint.
- **Em série dentro da fase:** qualquer mudança em `schema.sql`, `painel/*`, `layout.tsx`, `Header.tsx`, `format.ts`.
- **Saída:** `qa-auditor` e `security-auditor` reauditam; nenhum item crítico ou alto aberto.

### Fase 3: Banco de produção (S, **exige autorização do dono**)
- Criar o projeto Supabase, aplicar `schema.sql` e passar a usar `supabase/migrations/NNNN_nome.sql` para toda mudança.
- Os agentes preparam e revisam o SQL. **Quem executa em produção é o dono.**

### Fase 4: Pagamento em ambiente de teste (S, **depende do dono**)
- Compra de teste ponta a ponta no sandbox do Mercado Pago: cartão, Pix, boleto, webhook, reembolso, comissão de 5% conferida em centavos.
- O dono cadastra as credenciais de teste nas variáveis de ambiente; os agentes nunca as veem.

### Fase 5: Frete automático por CEP (S → P)
1. Banco (S): colunas de peso e medidas em `products` e config de frete; migração. `backend-developer`.
2. Serviço (S): `src/lib/frete.ts` e rota de cotação (Melhor Envio), com fallback para o frete fixo atual. `backend-developer`.
3. Interface (P com testes): cotação no carrinho e na página do produto; formulário de medidas no cadastro de produto. `frontend-developer`.
4. Auditoria de QA e de segurança.

### Fase 6: Crescimento (tarefas independentes, P)
Chat de ajuda com IA para compradores e vendedores, cupons, favoritos, e-mails de aviso, programa de indicação, relatórios. Cada uma é uma feature com banco → regra → interface → QA → segurança. Features que não compartilham arquivos rodam em paralelo.

### Fase 7: Pré-lançamento (S, **exige autorização do dono**)
Revisão jurídica de Termos e Privacidade, CNPJ, auditorias finais, deploy na Vercel, domínio. O deploy é sempre ação do dono.

## 5. Matriz de paralelismo

| Pode rodar junto | Não pode (conflito de arquivos ou contrato) |
|---|---|
| QA + Segurança (ambos só leem) | Dois agentes no `schema.sql` |
| Frontend (`components/`, `page.tsx`) + Backend (`api/`, `lib/`) com contrato definido antes | Qualquer um com Backend em `painel/actions.ts` |
| Account-manager (`entrar/`, `conta/`, `admin/usuarios/`) + Backend (`api/`) | Dois agentes mexendo em `package.json` |
| Features de crescimento sem arquivos em comum | Mudança em `auth.ts` ou `format.ts` com qualquer outra tarefa aberta |

## 6. Branches e worktrees

- Uma branch por tarefa: `feat/<nome>`, `fix/<nome>`, `chore/<nome>`, sempre a partir de `main`.
- Trabalho paralelo que possa tocar os mesmos arquivos: um **worktree** por tarefa (`git worktree add ../vitrine-<tarefa> -b feat/<tarefa>`), ou `isolation: "worktree"` ao delegar.
- O agente principal integra: merge na ordem banco → regra → interface, resolve conflitos, roda tipos, build e testes e apresenta o resumo ao dono.
- **Commit e push só quando o dono pedir.** O push já exige confirmação em `.claude/settings.json`.

## 7. Decisões que dependem do dono

- Executar SQL em qualquer banco real (Fase 3).
- Cadastrar credenciais de teste e de produção (Fases 4 e 7).
- Qualquer deploy, domínio ou ação em contas reais.
- Autorizar correções feitas pelo `qa-auditor` (ele é somente leitura por padrão).
- Contratar a revisão jurídica e abrir o CNPJ.

## 8. Como usar a equipe

1. Abra o Claude Code na pasta do projeto (os agentes de `.claude/agents/` são carregados ao iniciar a sessão; use `/agents` para conferir).
2. Peça ao agente principal uma tarefa, por exemplo: *"Execute a Fase 0 do `docs/PLANO.md`"*. Ele aciona o `project-manager` para dividir o trabalho, delega aos desenvolvedores, chama os auditores e traz o resumo.
3. Revise o resumo e autorize (ou não) os próximos passos.
