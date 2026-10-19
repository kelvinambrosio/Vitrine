import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Central de ajuda" };

const buyers: [string, string][] = [
  ["Como pago?", "Na hora de finalizar você escolhe Pix, cartão (até 12x) ou boleto. O pagamento é feito no ambiente seguro do Mercado Pago."],
  ["Quando meu pedido é confirmado?", "Só depois que o Mercado Pago aprova o pagamento. Pix costuma confirmar na hora; boleto, em 1 a 3 dias úteis."],
  ["Como acompanho a entrega?", "Em Meus pedidos você vê a linha do tempo com cada parada e a previsão de entrega, e recebe um aviso a cada atualização."],
  ["Posso comprar de lojas diferentes no mesmo pedido?", "Cada pedido é de uma loja só, porque cada loja tem seu próprio frete e prazo. Faça um pedido por loja."],
  ["Recebi o produto com defeito ou diferente. E agora?", "Fale primeiro com a loja. Você tem direito de arrependimento de 7 dias após o recebimento em compras online (Código de Defesa do Consumidor). Se não resolver, escreva para o nosso e-mail de suporte."],
  ["Como denuncio um anúncio?", "Na página do produto, clique em “Denunciar este anúncio” e descreva o problema."],
];

const sellers: [string, string][] = [
  ["Quanto custa vender?", "Não há mensalidade. A taxa é de 5% sobre o valor dos produtos de cada venda concluída (o frete não entra). O Mercado Pago cobra à parte a taxa dele por transação."],
  ["Como recebo o dinheiro?", "Você conecta sua conta do Mercado Pago no painel. A cada venda aprovada, o pagamento é dividido automaticamente: 5% para a Minha Vitrine e o restante para você, já sem a taxa do Mercado Pago."],
  ["Quando posso sacar?", "O prazo de liberação e os saques seguem as regras da sua conta do Mercado Pago."],
  ["Como atualizo o cliente sobre a entrega?", "No painel, em Pedidos, escolha a etapa (postado, em trânsito, saiu para entrega, entregue), informe o local e, ao postar, o código de rastreio. O cliente é avisado a cada registro."],
  ["Quais produtos são proibidos?", "Veja os Termos de uso. Produtos ilegais, falsificados ou que violem direitos de terceiros são removidos e a loja pode ser suspensa."],
  ["Como funciona um reembolso?", "Se o pedido for reembolsado, o valor devolvido ao cliente é descontado de você e da plataforma proporcionalmente (regra do Mercado Pago para marketplaces)."],
];

function Block({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="rounded-2xl bg-white p-6">
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      <div className="space-y-2">
        {items.map(([q, a]) => (
          <details key={q} className="rounded-lg border border-slate-200 p-3">
            <summary className="cursor-pointer font-medium">{q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Central de ajuda</h1>
      <Block title="Para compradores" items={buyers} />
      <Block title="Para vendedores" items={sellers} />
      <p className="text-sm text-slate-600">
        Não encontrou o que procura? Escreva para <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </div>
  );
}
