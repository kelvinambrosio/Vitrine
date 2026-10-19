import Link from "next/link";
import Flash from "@/components/Flash";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL, ORDER_STATUS_LABEL } from "@/lib/format";
import { adminRefund } from "../actions";

export const metadata = { title: "Administração: pedidos e pagamentos" };

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  await requireAdmin();

  const { data: orders } = await createAdminClient()
    .from("orders")
    .select("id,status,total_cents,commission_cents,commission_rate,mp_payment_id,notes,created_at,paid_at,stores(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-brand hover:underline">← Painel administrativo</Link>
      <h1 className="text-2xl font-bold">Pedidos e pagamentos</h1>
      <Flash erro={erro} ok={ok} />
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr>
              <th className="p-3">Pedido</th><th className="p-3">Loja</th><th className="p-3">Status</th>
              <th className="p-3">Total</th><th className="p-3">Sua comissão</th><th className="p-3">Pagamento MP</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 align-top">
                <td className="p-3">#{o.id.slice(0, 8)}<br /><span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span></td>
                <td className="p-3">{(o.stores as unknown as { name: string } | null)?.name}</td>
                <td className="p-3">{ORDER_STATUS_LABEL[o.status]}{o.notes && <p className="mt-1 text-xs text-amber-700">{o.notes}</p>}</td>
                <td className="p-3">{formatBRL(o.total_cents)}</td>
                <td className="p-3">{formatBRL(o.commission_cents)} <span className="text-xs text-slate-400">({(Number(o.commission_rate) * 100).toFixed(1).replace(".", ",")}%)</span></td>
                <td className="p-3 text-xs">{o.mp_payment_id ?? "-"}</td>
                <td className="p-3">
                  {["paid", "shipped", "delivered"].includes(o.status) && o.mp_payment_id && (
                    <details>
                      <summary className="cursor-pointer text-slate-500">Reembolsar</summary>
                      <form action={adminRefund} className="mt-1">
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">Confirmar</button>
                      </form>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
