import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-6 text-sm leading-relaxed text-slate-700">
      <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
        <strong>Modelo inicial.</strong> Este texto é um ponto de partida e deve ser revisado por um advogado antes do
        lançamento. Preencha razão social e CNPJ no final.
      </p>
      <h1 className="text-2xl font-bold text-slate-900">Termos de uso</h1>

      <h2 className="text-lg font-semibold text-slate-900">1. O que é a Minha Vitrine</h2>
      <p>
        A Minha Vitrine é um marketplace: um ambiente online que reúne lojas independentes. Os produtos são vendidos pelos
        próprios vendedores, que são responsáveis pelo anúncio, estoque, envio e atendimento. A Minha Vitrine intermedeia a
        apresentação dos produtos e o pagamento.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">2. Cadastro</h2>
      <p>Você deve fornecer dados verdadeiros e manter sua senha em segurança. Cada pessoa pode ter uma loja.</p>

      <h2 className="text-lg font-semibold text-slate-900">3. Taxa para vendedores</h2>
      <p>
        Não há mensalidade. Cobramos <strong>5% sobre o valor dos produtos</strong> de cada venda concluída (o frete não
        entra no cálculo). O percentual é descontado automaticamente no momento do pagamento, por meio do Mercado Pago, que
        cobra à parte a sua própria taxa. Podemos alterar a taxa mediante aviso prévio aos vendedores, sem efeito sobre
        vendas já realizadas.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">4. Pagamentos</h2>
      <p>
        Os pagamentos são processados pelo Mercado Pago. Um pedido só é confirmado após a aprovação do pagamento.
        Cancelamentos e reembolsos seguem as regras do Mercado Pago e da legislação de defesa do consumidor.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">5. Entrega, arrependimento e trocas</h2>
      <p>
        O vendedor deve postar o pedido no prazo informado e registrar o rastreio. O comprador tem direito de arrependimento
        em até 7 dias corridos após o recebimento, nos termos do art. 49 do Código de Defesa do Consumidor, além dos direitos
        em caso de vício ou defeito do produto.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">6. Condutas e produtos proibidos</h2>
      <p>
        É proibido anunciar produtos ilegais, falsificados, que violem direitos de terceiros, armas, drogas, itens roubados,
        conteúdo adulto, ou qualquer produto cuja venda a lei restrinja. Tentativas de fraude, de levar o pagamento para fora
        da plataforma ou de burlar avaliações podem levar à remoção de anúncios e à suspensão da conta.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">7. Denúncias e moderação</h2>
      <p>Qualquer usuário pode denunciar anúncios. Podemos remover conteúdo e suspender lojas que violem estes termos.</p>

      <h2 className="text-lg font-semibold text-slate-900">8. Responsabilidade</h2>
      <p>
        O vendedor responde pelos produtos que anuncia e vende. A Minha Vitrine atua como intermediadora e se compromete a
        colaborar na solução de problemas, sem substituir o vendedor nas obrigações da venda.
      </p>

      <h2 className="text-lg font-semibold text-slate-900">9. Contato</h2>
      <p>Dúvidas: {SUPPORT_EMAIL}.</p>
      <p className="text-slate-500">[Razão social], CNPJ [00.000.000/0000-00], [endereço].</p>
    </article>
  );
}
