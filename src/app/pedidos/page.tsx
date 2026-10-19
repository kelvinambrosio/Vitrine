import Link from "next/link";
import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { formatBRL, ORDER_STATUS_LABEL } from "@/lib/format";
import { formatDateBR } from "@/lib/notify";
import { markNotificationsRead } from "./actions";

export const metadata = { title: "Meus pedidos" };

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const { supabase, user } = await requireUser("/pedidos");

  const [{ data: orders }, { data: notifications }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,status,total_cents,estimated_delivery,created_at,stores(name),order_items(name,quantity)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("notifications").select("id,order_id,message,read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus pedidos</h1>
      <Flash erro={erro} ok={ok} />

      {notifications && notifications.length > 0 && (
        <section className="rounded-2xl bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Avisos {unread > 0 && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-white">{unread} novos</span>}</h2>
            {unread > 0 && (
              <form action={markNotificationsRead}>
                <button className="text-sm text-brand hover:underline">Marcar como lidos</button>
              </form>
            )}
          </div>
          <ul className="space-y-2 text-sm">
            {notifications.map((n) => (
              <li key={n.id} className={n.read ? "text-slate-500" : "font-medium"}>
                <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                <br />
                {n.order_id ? <Link href={`/pedidos/${n.order_id}`} className="hover:text-brand">{n.message}</Link> : n.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {orders && orders.length > 0 ? (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/pedidos/${o.id}`} className="block rounded-2xl bg-white p-5 hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Pedido #{o.id.slice(0, 8)} · {(o.stores as unknown as { name: string })?.name}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{ORDER_STATUS_LABEL[o.status]}</span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {o.order_items?.map((i: { name: string; quantity: number }) => `${i.quantity}× ${i.name}`).join(", ")}
                </p>
                <p className="mt-1 text-sm">
                  {formatBRL(o.total_cents)}
                  {o.estimated_delivery && ["paid", "shipped"].includes(o.status) && (
                    <> · Previsão de entrega: <strong>{formatDateBR(o.estimated_delivery)}</strong></>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Você ainda não fez pedidos. <Link href="/busca" className="font-semibold text-brand underline">Ver produtos</Link>
        </p>
      )}
    </div>
  );
}
