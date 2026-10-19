import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-6 text-sm leading-relaxed text-slate-700">
      <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
        <strong>Modelo inicial.</strong> Revise com um advogado antes do lançamento e preencha os dados do controlador.
      </p>
      <h1 className="text-2xl font-bold text-slate-900">Política de privacidade (LGPD)</h1>

      <h2 className="text-lg font-semibold text-slate-900">Quais dados coletamos</h2>
      <p>
        Nome, e-mail e senha (criptografada) no cadastro; endereço de entrega e dados do pedido nas compras; dados da loja
        (nome, logotipo, descrição, cidade) para vendedores; e a conta do Mercado Pago conectada, para repasse dos valores.
        Dados de cartão são tratados diretamente pelo Mercado Pago, e não são armazenados por nós.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Para que usamos</h2>
      <p>
        Executar compras e vendas, processar pagamentos e entregas, avisar sobre o andamento do pedido, prevenir fraudes,
        cumprir obrigações legais e atender solicitações de suporte.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Com quem compartilhamos</h2>
      <p>
        Com o vendedor, apenas o necessário para entregar o pedido (nome e endereço de entrega); com o Mercado Pago, para o
        pagamento; e com provedores de infraestrutura que hospedam o site. Não vendemos seus dados.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Seus direitos</h2>
      <p>
        Você pode solicitar confirmação do tratamento, acesso, correção, anonimização, portabilidade, eliminação dos dados e
        informações sobre compartilhamento, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Escreva para{" "}
        {SUPPORT_EMAIL}.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">Armazenamento e segurança</h2>
      <p>
        Os dados ficam em banco de dados com controle de acesso por usuário. Guardamos os dados pelo tempo necessário para
        cumprir obrigações legais e fiscais.
      </p>
      <p className="text-slate-500">Controlador: [Razão social], CNPJ [00.000.000/0000-00]. Encarregado (DPO): [nome e e-mail].</p>
    </article>
  );
}
