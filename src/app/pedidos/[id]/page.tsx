import Link from "next/link";
import { notFound } from "next/navigation";
import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { formatBRL, ORDER_STATUS_LABEL } from "@/lib/format";
import { EVENT_LABEL, formatDateBR } from "@/lib/notify";
import { confirmDelivered, createReview } from "../actions";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  if (!UUID.test(id)) notFound();

  const { supabase, user } = await requireUser(`/pedidos/${id}`);
  const { data: order } = await supabase
    .from("orders")
    .select("*, stores(name,slug), order_items(name,variant,quantity,unit_price_cents), order_events(kind,description,location,created_at)")
    .eq("id", id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: review } = await supabase.from("reviews").select("rating,comment").eq("order_id", id).maybeSingle();

  const events = [...(order.order_events ?? [])].sort(
    (a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at)
  ) as { kind: string; description: string; location: string | null; created_at: string }[];
  const addr = order.shipping_address as Record<string, string>;
  const store = order.stores as unknown as { name: string; slug: string };
  const inProgress = ["paid", "shipped"].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/pedidos" className="text-sm text-brand hover:underline">← Meus pedidos</Link>
      <Flash erro={erro} ok={ok} />

      <section className="rounded-2xl bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">Pedido #{order.id.slice(0, 8)}</h1>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">{ORDER_STATUS_LABEL[order.status]}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Loja: <Link href={`/loja/${store.slug}`} className="text-brand hover:underline">{store.name}</Link>
        </p>

        {order.status === "pending" && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Estamos aguardando a confirmação do pagamento pelo Mercado Pago. Pix costuma confirmar na hora; boleto pode levar de 1 a 3 dias úteis.
          </p>
        )}

        {inProgress && order.estimated_delivery && (
          <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Previsão de entrega: <strong>{formatDateBR(order.estimated_delivery)}</strong>
          </p>
        )}
        {(order.tracking_code || order.carrier) && (
          <p className="mt-2 text-sm">
            {order.carrier && <>Transportadora: <strong>{order.carrier}</strong> · </>}
            {order.tracking_code && <>Código de rastreio: <strong>{order.tracking_code}</strong></>}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6">
        <h2 className="mb-3 font-bold">Acompanhe seu pedido</h2>
        {events.length > 0 ? (
          <ol className="relative space-y-4 border-l-2 border-brand-soft pl-5">
            {events.map((e, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-brand" />
                <p className="font-medium">{EVENT_LABEL[e.kind] ?? "Atualização"}{e.location ? ` · ${e.location}` : ""}</p>
                <p className="text-sm text-slate-600">{e.description}</p>
                <p className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString("pt-BR")}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">As atualizações aparecem aqui e você é avisado a cada nova etapa.</p>
        )}
        {inProgress && (
          <form action={confirmDelivered} className="mt-5">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Já recebi meu pedido</button>
          </form>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 text-sm">
        <h2 className="mb-2 font-bold">Resumo</h2>
        <ul className="space-y-1">
          {order.order_items?.map((i: { name: string; variant: string | null; quantity: number; unit_price_cents: number }, idx: number) => (
            <li key={idx} className="flex justify-between">
              <span>{i.quantity}× {i.name}{i.variant ? ` (${i.variant})` : ""}</span>
              <span>{formatBRL(i.unit_price_cents * i.quantity)}</span>
            </li>
          ))}
          <li className="flex justify-between text-slate-500"><span>Frete</span><span>{formatBRL(order.shipping_cents)}</span></li>
          <li className="flex justify-between border-t border-slate-100 pt-1 font-bold"><span>Total</span><span>{formatBRL(order.total_cents)}</span></li>
        </ul>
        <p className="mt-3 text-slate-600">
          Entrega em: {addr.name}, {addr.street}, {addr.number}{addr.complement ? ` ${addr.complement}` : ""}, {addr.district}, {addr.city}/{addr.state}, CEP {addr.cep}
        </p>
      </section>

      {order.status === "delivered" && (
        <section className="rounded-2xl bg-white p-6">
          <h2 className="mb-2 font-bold">Avaliar a loja</h2>
          {review ? (
            <p className="text-sm text-slate-600">Você avaliou com {review.rating} de 5 estrelas. Obrigado!</p>
          ) : (
            <form action={createReview} className="space-y-3 text-sm">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block">Nota
                <select name="rating" className="ml-2 rounded-lg border border-slate-300 px-2 py-1" defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (<option key={n} value={n}>{n} {"★".repeat(n)}</option>))}
                </select>
              </label>
              <textarea name="comment" rows={3} maxLength={1000} placeholder="Conte como foi a compra (opcional)" className="w-full rounded-lg border border-slate-300 p-2" />
              <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark">Enviar avaliação</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
