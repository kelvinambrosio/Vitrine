# Minha Vitrine: guia para colocar no ar

Este projeto é um marketplace completo (Next.js + Supabase + Mercado Pago). **Ele ainda não foi compilado nem testado**, porque o ambiente onde foi escrito não conseguia instalar pacotes. Na primeira vez que você rodar, podem aparecer pequenos erros; copie a mensagem e peça ajuda a uma IA ou a mim, que a correção costuma ser rápida. Os arquivos passaram numa checagem de sintaxe.

Tempo estimado: 1 a 2 horas, na primeira vez.

## O que você vai precisar (todas gratuitas para começar)

| Serviço | Para quê | Onde |
|---|---|---|
| GitHub | guardar o código | github.com |
| Supabase | banco de dados, login e fotos | supabase.com |
| Vercel | colocar o site no ar | vercel.com |
| Mercado Pago (conta de desenvolvedor) | pagamentos e divisão dos 5% | mercadopago.com.br/developers |
| Resend (opcional) | e-mails de aviso de pedido | resend.com |

## Passo 1: testar no seu computador (opcional, mas recomendado)

1. Instale o Node.js (versão 20 ou mais nova) em nodejs.org.
2. Abra um terminal dentro da pasta `minha-vitrine` e rode `npm install`, depois `npm run dev`.
3. Abra http://localhost:3000. Sem o Supabase conectado você verá o aviso “Falta conectar o banco de dados”. É normal.

## Passo 2: Supabase (banco de dados)

1. Crie uma conta e um projeto novo (região **South America (São Paulo)**). Guarde a senha do banco.
2. No menu **SQL Editor**, clique em *New query*, cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Isso cria tabelas, regras de segurança, categorias, a comissão de 5% e a pasta de fotos.
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca mostre a ninguém nem publique)
4. Em **Authentication → URL Configuration**, coloque em *Site URL* o endereço final do site (você terá no Passo 4) e adicione `https://SEU-SITE/**` em *Redirect URLs* (com os dois asteriscos, para valer também no link de recuperação de senha).
5. Em **Authentication → Providers → Email**, deixe a confirmação de e-mail ligada. Para o seu site enviar e-mails de confirmação em volume, configure depois um SMTP próprio (o Resend serve); o e-mail padrão do Supabase tem limite baixo de envios por hora.

## Passo 3: GitHub

1. Crie um repositório **privado** no GitHub e envie a pasta `minha-vitrine` (o arquivo `.gitignore` já impede que o `.env.local` vá junto).
   Mais fácil: no site do GitHub, *Add file → Upload files* e arraste os arquivos.

## Passo 4: Vercel (aqui nasce a sua URL)

1. Em vercel.com, entre com o GitHub e clique em **Add New → Project**; escolha o repositório.
2. Em **Environment Variables**, cadastre todas as variáveis do arquivo `.env.example` (copie os nomes; use os valores do Supabase e, por enquanto, deixe as do Mercado Pago em branco).
   Em `CRON_SECRET` invente uma senha longa e aleatória (32 caracteres). Ela protege a limpeza diária que cancela pedidos sem pagamento há mais de 5 dias.
3. Em `NEXT_PUBLIC_SITE_URL`, coloque o endereço do site. Na primeira vez você não o sabe: rode o deploy, veja a URL (algo como `minha-vitrine.vercel.app`), volte, preencha e clique em **Redeploy**.
4. Clique em **Deploy**. **A URL que a Vercel mostrar é o endereço do seu site.**
5. Domínio próprio (opcional): compre um `.com.br` (cerca de R$ 40 por ano) e adicione em *Settings → Domains*.

> Atenção: confira os termos do plano gratuito da Vercel. Ele é voltado a projetos pessoais; para um negócio que cobra comissão, planeje o plano pago (cerca de US$ 20/mês) ou use outra hospedagem.

## Passo 5: seu usuário administrador

1. No site, clique em **Entrar** → **Criar conta grátis** com o seu e-mail e confirme o e-mail.
2. No Supabase, **SQL Editor**, rode (trocando pelo seu e-mail):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'SEU@EMAIL.COM');
```

3. Acesse `https://SEU-SITE/admin`. Lá você controla comissão, lojas, denúncias, categorias e destaques, e vê as estatísticas. Em `/admin/usuarios` você bloqueia usuários e em `/admin/pedidos` acompanha pagamentos, sua comissão por pedido e faz reembolsos.

## Passo 6: Mercado Pago (receber o dinheiro)

1. Em mercadopago.com.br/developers → **Suas integrações → Criar aplicação**. Escolha *Pagamentos online* e o modelo **Marketplace** (split de pagamentos 1:1).
2. Na aplicação, copie `Client ID` → `MP_CLIENT_ID` e `Client Secret` → `MP_CLIENT_SECRET`.
3. Em **Redirect URL** (OAuth) cadastre: `https://SEU-SITE/api/mp/callback`.
4. Em **Webhooks → Configurar notificações**, cadastre: `https://SEU-SITE/api/webhooks/mercadopago`, marque o evento **Pagamentos** e copie a *chave secreta* → `MP_WEBHOOK_SECRET`.
5. Atualize as variáveis na Vercel e clique em **Redeploy**.
6. Para ativar o recebimento da **sua** plataforma e o Pix, siga as etapas de homologação/credenciais de produção do Mercado Pago (conta verificada, chave Pix).
7. **Teste antes de abrir ao público:** use as credenciais e os cartões de teste do Mercado Pago, com uma loja de teste e uma compra de teste.

### Como o dinheiro e os 5% funcionam

- O comprador paga no Mercado Pago (Pix, cartão ou boleto).
- O Mercado Pago divide **na hora do pagamento**: a taxa dele sai primeiro, depois os **5% da Minha Vitrine** (calculados pelo site sobre o valor dos produtos, sem o frete) caem na **sua** conta, e o restante cai na conta do vendedor.
- Ou seja, o dinheiro **não passa por você antes de ir ao vendedor**: a divisão é automática e você nunca precisa fazer repasse. Isso é bom para você (menos responsabilidade e risco), e é como o split 1:1 do Mercado Pago funciona.
- O pedido só vira “pago” quando o Mercado Pago confirma (o site consulta o pagamento na API antes de aceitar, e confere o valor).
- Reembolsos: o Mercado Pago devolve ao cliente e desconta proporcionalmente de você e do vendedor.

## Passo 7: e-mails de aviso (opcional)

Crie uma conta no Resend, gere uma chave (`RESEND_API_KEY`) e, quando tiver domínio, valide-o para poder enviar de `avisos@seudominio.com.br`. Sem isso, os avisos aparecem na página **Meus pedidos**, e o resto funciona normalmente.

## Onde mexer em cada coisa

| Quero… | Onde |
|---|---|
| Mudar a comissão, suspender lojas, ver denúncias | `/admin` no seu site |
| Ver e mexer no banco, usuários e fotos | painel do Supabase |
| Ver o site no ar, domínio, variáveis secretas, logs de erros | painel da Vercel |
| Ver pagamentos, taxas e o que você recebeu | painel do Mercado Pago |
| Mudar textos de ajuda, termos e privacidade | arquivos em `src/app/ajuda`, `termos`, `privacidade` |
| Mudar cores e nome | `src/app/globals.css` e `src/components/Header.tsx` |

## Mensagem para os vendedores (taxa de 5%)

Ainda não há vendedores cadastrados, então ainda não há para quem enviar. A taxa já aparece em: página inicial, página **Venda grátis** (`/vender`), painel do vendedor, Central de ajuda e Termos de uso. Quando você tiver vendedores, envie por e-mail ou WhatsApp este texto:

> Olá! A Minha Vitrine não cobra mensalidade. Cobramos apenas **5% sobre o valor dos produtos de cada venda concluída** (o frete não entra). O desconto é automático no pagamento e você recebe o restante direto na sua conta do Mercado Pago, que cobra à parte a taxa dele por transação. Qualquer dúvida, responda esta mensagem.

## O que a revisão encontrou e já corrigi

- **Envio de fotos:** a hospedagem recusa envios acima de 4,5 MB. As fotos agora são reduzidas no navegador antes de enviar, e o banco só aceita JPG, PNG e WEBP de até 4 MB.
- **Token do Mercado Pago:** ele expira (cerca de 6 meses) e as vendas parariam sem aviso. Agora é renovado automaticamente.
- **Pedidos sem pagamento:** ficavam eternamente pendentes. Agora são cancelados após 5 dias, e cada comprador pode ter no máximo 5 pedidos pendentes por hora.
- **Faltavam do seu pedido original:** reembolso (pelo vendedor e por você, devolvendo o estoque), usuários e pagamentos no painel admin, comparação de preços entre lojas na página do produto, recuperar senha, e os direitos da LGPD (baixar e excluir os próprios dados em `/conta`).
- **Polimento:** páginas de erro e de “não encontrado”, `sitemap.xml` e `robots.txt` para o Google, títulos e imagens de compartilhamento por produto e por loja.

## O que ainda NÃO está pronto (próximas etapas)

- Cálculo automático de frete por CEP e etiquetas (hoje o frete é um valor fixo por loja; o vendedor informa o rastreio manualmente). Próximo passo: integrar Melhor Envio, o que exige peso e medidas nos produtos e uma conta/token do Melhor Envio. Prefiro fazer depois que o site estiver no ar, para testar com uma conta real.
- Estoque: ele só é baixado quando o pagamento é aprovado. Em caso raro de dois compradores pagarem a última unidade ao mesmo tempo, o pedido recebe um aviso no painel do vendedor e do admin para resolver manualmente.
- Notas fiscais: se a sua atividade ou a do vendedor exigir, a emissão é por fora do site.
- Atualização automática do rastreio pelos Correios/transportadoras (hoje o vendedor registra cada etapa e o cliente é avisado).
- Cupons, favoritos, chat, programa de indicação, relatórios e ferramentas de IA.
- Comparador de preços entre lojas, paginação e filtros avançados.
- Antifraude além do básico (verificação de e-mail, aprovação manual de lojas, limites de tentativas). Recomendo aprovar as primeiras lojas manualmente pelo `/admin`.
- Revisão jurídica de Termos e Privacidade e cadastro do CNPJ.
