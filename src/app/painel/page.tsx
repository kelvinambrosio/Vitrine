import Link from "next/link";
import Flash from "@/components/Flash";
import ImageInput from "@/components/ImageInput";
import { getMyStore, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, ORDER_STATUS_LABEL } from "@/lib/format";
import { EVENT_LABEL, formatDateBR } from "@/lib/notify";
import {
  addTrackingEvent,
  createStore,
  deleteProduct,
  refundMyOrder,
  toggleProduct,
  updateStock,
  updateStore,
} from "./actions";

export const metadata = { title: "Painel do vendedor" };

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand";
const card = "rounded-2xl bg-white p-6";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const { supabase, user } = await requireUser("/painel");
  const store = await getMyStore(supabase, user.id);

  // ---------- Ainda sem loja: formulário de criação ----------
  if (!store) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-bold">Abra sua loja grátis</h1>
        <p className="mb-4 text-sm text-slate-600">
          Sem mensalidade. A Minha Vitrine cobra apenas <strong>5% sobre o valor dos produtos</strong> de cada venda concluída.
        </p>
        <Flash erro={erro} ok={ok} />
        <form action={createStore} className={`${card} space-y-4`}>
          <label className="block text-sm">Nome da loja
            <input name="name" required minLength={3} maxLength={60} className={input} />
          </label>
          <label className="block text-sm">Descrição
            <textarea name="description" rows={3} maxLength={1000} className={input} />
          </label>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <label className="block text-sm">Cidade
              <input name="city" className={input} />
            </label>
            <label className="block text-sm">UF
              <input name="state" maxLength={2} className={input} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Frete padrão (R$)
              <input name="shipping" defaultValue="0" inputMode="decimal" className={input} />
            </label>
            <label className="block text-sm">Dias para postar
              <input name="handling_days" type="number" min={0} max={30} defaultValue={2} className={input} />
            </label>
            <label className="block text-sm">Prazo de entrega (dias)
              <input name="delivery_days" type="number" min={1} max={60} defaultValue={7} className={input} />
            </label>
          </div>
          <div className="text-sm">
            <p className="mb-1">Logotipo (opcional)</p>
            <ImageInput name="logo" />
          </div>
          <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">Criar minha loja</button>
        </form>
      </div>
    );
  }

  // ---------- Loja existente ----------
  const admin = createAdminClient();
  const { data: account } = await admin.from("store_payment_accounts").select("store_id").eq("store_id", store.id).maybeSingle();

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase.from("products").select("id,name,price_cents,stock,active").eq("store_id", store.id).order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*, order_items(name,variant,quantity), order_events(kind,description,created_at)")
      .eq("store_id", store.id)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sold = (orders ?? []).filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
  const gross = sold.reduce((s, o) => s + o.total_cents, 0);
  const commission = sold.reduce((s, o) => s + o.commission_cents, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <Link href={`/loja/${store.slug}`} className="text-sm text-brand hover:underline">Ver minha loja pública</Link>
        </div>
        <Link href="/painel/produtos/novo" className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
          + Novo produto
        </Link>
      </div>

      <Flash erro={erro} ok={ok} />
      {store.status === "suspended" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Sua loja está suspensa. Entre em contato com o suporte.</p>
      )}

      {/* Mercado Pago */}
      <section className={card}>
        <h2 className="font-bold">Recebimento de pagamentos</h2>
        {account ? (
          <p className="mt-1 text-sm text-emerald-700">✅ Mercado Pago conectado. O valor das vendas cai direto na sua conta do Mercado Pago.</p>
        ) : (
          <div className="mt-1 text-sm text-slate-600">
            <p>⚠️ Conecte sua conta do Mercado Pago para começar a vender. É por ela que você recebe, já descontado o que o Mercado Pago cobra.</p>
            <a href="/api/mp/connect" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:opacity-90">
              Conectar Mercado Pago
            </a>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Taxa da Minha Vitrine: <strong>5% do valor dos produtos</strong> de cada venda (o frete não entra). Sem mensalidade.
        </p>
      </section>

      {/* Resumo */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-sm text-slate-500">Vendas concluídas</p><p className="text-2xl font-bold">{sold.length}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Total vendido (com frete)</p><p className="text-2xl font-bold">{formatBRL(gross)}</p></div>
        <div className={card}>
          <p className="text-sm text-slate-500">Comissão da plataforma</p>
          <p className="text-2xl font-bold">{formatBRL(commission)}</p>
          <p className="mt-1 text-xs text-slate-400">Além da taxa do Mercado Pago, cobrada por ele.</p>
        </div>
      </section>

      {/* Pedidos e rastreio */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Pedidos</h2>
        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((o) => {
              const addr = o.shipping_address as Record<string, string>;
              const events = [...(o.order_events ?? [])].sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at));
              const canTrack = ["paid", "shipped"].includes(o.status);
              return (
                <article key={o.id} className={card}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Pedido #{o.id.slice(0, 8)}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{ORDER_STATUS_LABEL[o.status]}</span>
                  </div>
                  <ul className="mt-2 text-sm text-slate-700">
                    {o.order_items?.map((i: { name: string; variant: string | null; quantity: number }, idx: number) => (
                      <li key={idx}>{i.quantity}× {i.name}{i.variant ? ` (${i.variant})` : ""}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-slate-600">
                    Enviar para: {addr.name}, {addr.street}, {addr.number}{addr.complement ? ` ${addr.complement}` : ""}, {addr.district}, {addr.city}/{addr.state}, CEP {addr.cep}
                  </p>
                  <p className="mt-1 text-sm">
                    Total {formatBRL(o.total_cents)} · comissão {formatBRL(o.commission_cents)}
                    {o.estimated_delivery && <> · Previsão: <strong>{formatDateBR(o.estimated_delivery)}</strong></>}
                    {o.tracking_code && <> · Rastreio: <strong>{o.tracking_code}</strong></>}
                  </p>
                  {o.notes && <p className="mt-1 rounded bg-amber-50 p-2 text-xs text-amber-800">{o.notes}</p>}

                  {events.length > 0 && (
                    <ol className="mt-3 space-y-1 border-l-2 border-brand-soft pl-3 text-xs text-slate-600">
                      {events.map((e: { kind: string; description: string; created_at: string }, idx: number) => (
                        <li key={idx}>
                          <span className="text-slate-400">{new Date(e.created_at).toLocaleString("pt-BR")}</span> · {e.description || EVENT_LABEL[e.kind]}
                        </li>
                      ))}
                    </ol>
                  )}

                  {canTrack && (
                    <form action={addTrackingEvent} className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <label className="text-xs">Nova atualização
                        <select name="kind" className={input} defaultValue={o.status === "paid" ? "posted" : "in_transit"}>
                          <option value="posted">Pedido postado</option>
                          <option value="in_transit">Em trânsito</option>
                          <option value="out_for_delivery">Saiu para entrega</option>
                          <option value="delivery_attempt_failed">Tentativa de entrega sem sucesso</option>
                          <option value="delivered">Entregue</option>
                          <option value="info">Outra informação</option>
                        </select>
                      </label>
                      <label className="text-xs">Local (cidade/UF)
                        <input name="location" placeholder="Ex.: Campinas/SP" className={input} />
                      </label>
                      <label className="text-xs">Código de rastreio (ao postar)
                        <input name="tracking_code" defaultValue={o.tracking_code ?? ""} className={input} />
                      </label>
                      <label className="text-xs">Transportadora
                        <input name="carrier" defaultValue={o.carrier ?? ""} placeholder="Correios, Jadlog…" className={input} />
                      </label>
                      <label className="text-xs">Nova previsão de entrega (opcional)
                        <input name="estimated_delivery" type="date" defaultValue={o.estimated_delivery ?? ""} className={input} />
                      </label>
                      <label className="text-xs">Observação (opcional)
                        <input name="note" maxLength={200} className={input} />
                      </label>
                      <button className="rounded-lg bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:col-span-2">
                        Registrar e avisar o cliente
                      </button>
                    </form>
                  )}
                  {["paid", "shipped", "delivered"].includes(o.status) && o.mp_payment_id && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Reembolsar este pedido</summary>
                      <form action={refundMyOrder} className="mt-2 rounded-lg bg-red-50 p-3">
                        <input type="hidden" name="orderId" value={o.id} />
                        <p className="mb-2 text-red-800">
                          O valor será devolvido ao comprador pelo Mercado Pago, e a taxa e a comissão são ajustadas proporcionalmente.
                          Não dá para desfazer.
                        </p>
                        <button className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
                          Confirmar reembolso total
                        </button>
                      </form>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum pedido pago ainda.</p>
        )}
      </section>

      {/* Produtos */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Produtos</h2>
        {products && products.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr><th className="p-3">Produto</th><th className="p-3">Preço</th><th className="p-3">Estoque</th><th className="p-3">Ações</th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 align-middle">
                    <td className="p-3">
                      <Link href={`/produto/${p.id}`} className="hover:text-brand">{p.name}</Link>
                      {!p.active && <span className="ml-2 rounded bg-slate-200 px-1.5 text-xs">pausado</span>}
                    </td>
                    <td className="p-3">{formatBRL(p.price_cents)}</td>
                    <td className="p-3">
                      <form action={updateStock} className="flex gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="stock" type="number" min={0} defaultValue={p.stock} className="w-20 rounded border border-slate-300 px-2 py-1" />
                        <button className="rounded border border-slate-300 px-2 hover:bg-slate-100">Salvar</button>
                      </form>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <form action={toggleProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={String(p.active)} />
                          <button className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100">{p.active ? "Pausar" : "Reativar"}</button>
                        </form>
                        <form action={deleteProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50">Apagar</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum produto ainda. Clique em “Novo produto”.</p>
        )}
      </section>

      {/* Configurações */}
      <section className={card}>
        <h2 className="mb-3 font-bold">Configurações da loja</h2>
        <form action={updateStore} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">Descrição
            <textarea name="description" rows={3} defaultValue={store.description ?? ""} className={input} />
          </label>
          <label className="block text-sm">Frete padrão (R$)
            <input name="shipping" defaultValue={(store.shipping_cents / 100).toFixed(2).replace(".", ",")} className={input} />
          </label>
          <label className="block text-sm">Dias para postar após o pagamento
            <input name="handling_days" type="number" min={0} max={30} defaultValue={store.handling_days} className={input} />
          </label>
          <label className="block text-sm">Prazo de entrega após postar (dias)
            <input name="delivery_days" type="number" min={1} max={60} defaultValue={store.delivery_days} className={input} />
          </label>
          <div className="text-sm">
            <p className="mb-1">Trocar logotipo</p>
            <ImageInput name="logo" />
          </div>
          <button className="rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark sm:col-span-2">Salvar</button>
        </form>
      </section>
    </div>
  );
}
