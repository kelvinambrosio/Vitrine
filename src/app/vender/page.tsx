import Link from "next/link";

export const metadata = { title: "Venda grátis na Minha Vitrine" };

export default function VenderPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-emerald-500 p-8 text-white md:p-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">Abra sua loja grátis e venda para todo o Brasil</h1>
        <p className="mt-3 text-emerald-50">Sem mensalidade e sem taxa de cadastro. Você só paga quando vende.</p>
        <Link href="/painel" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand hover:bg-brand-soft">
          Criar minha loja
        </Link>
      </section>

      <section className="rounded-2xl bg-white p-6">
        <h2 className="text-xl font-bold">Quanto custa?</h2>
        <p className="mt-2 text-slate-700">
          A Minha Vitrine cobra uma taxa de apenas <strong>5% sobre o valor dos produtos</strong> de cada venda concluída. O
          frete não entra no cálculo. Não há mensalidade.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          O Mercado Pago, que processa os pagamentos, cobra a sua própria taxa por transação. Ela é descontada do valor
          recebido e depois calculamos os 5% sobre o que sobra (regra do Mercado Pago para marketplaces). Exemplo ilustrativo:
          em um produto de R$ 100, a Minha Vitrine fica com R$ 5 e o restante, já sem a taxa do Mercado Pago, cai na sua conta.
        </p>
      </section>

      <section className="rounded-2xl bg-white p-6">
        <h2 className="text-xl font-bold">Como começar</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
          <li>Crie sua conta e abra a loja (nome, logotipo, descrição e cidade).</li>
          <li>Conecte sua conta do Mercado Pago. É por ela que você recebe.</li>
          <li>Cadastre produtos com fotos, preço, estoque e variações.</li>
          <li>Quando vender, poste o pedido e registre o rastreio. O cliente é avisado a cada etapa.</li>
        </ol>
        <p className="mt-4 text-sm text-slate-500">
          Dúvidas? Veja a <Link href="/ajuda" className="underline">Central de ajuda</Link>.
        </p>
      </section>
    </div>
  );
}
