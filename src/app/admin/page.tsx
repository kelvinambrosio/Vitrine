import Flash from "@/components/Flash";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommissionRate } from "@/lib/commission";
import { formatBRL } from "@/lib/format";
import { addCategory, resolveReport, setCommission, setStoreStatus, toggleFeatured } from "./actions";

export const metadata = { title: "Administração" };

const input = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand";
const card = "rounded-2xl bg-white p-6";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();
  const rate = await getCommissionRate();

  const [users, stores, products, orders, reports, categories, featuredCandidates] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("stores").select("id,name,slug,status,created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("orders").select("total_cents,commission_cents,status").in("status", ["paid", "shipped", "delivered"]),
    admin
      .from("reports")
      .select("id,reason,created_at,product_id,products(name)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("categories").select("id,name").order("name"),
    admin.from("products").select("id,name,featured").eq("active", true).order("created_at", { ascending: false }).limit(30),
  ]);

  const sales = orders.data ?? [];
  const gmv = sales.reduce((s, o) => s + o.total_cents, 0);
  const revenue = sales.reduce((s, o) => s + o.commission_cents, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Painel administrativo</h1>
        <nav className="flex gap-2 text-sm">
          <a href="/admin/usuarios" className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-100">Usuários</a>
          <a href="/admin/pedidos" className="rounded-lg border border-slate-300 bg-white px-3 py-2 hover:bg-slate-100">Pedidos e pagamentos</a>
        </nav>
      </div>
      <Flash erro={erro} ok={ok} />

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        <div className={card}><p className="text-sm text-slate-500">Usuários</p><p className="text-2xl font-bold">{users.count ?? 0}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Lojas</p><p className="text-2xl font-bold">{stores.data?.length ?? 0}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Produtos</p><p className="text-2xl font-bold">{products.count ?? 0}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Vendido (bruto)</p><p className="text-2xl font-bold">{formatBRL(gmv)}</p></div>
        <div className={card}><p className="text-sm text-slate-500">Sua receita (comissões)</p><p className="text-2xl font-bold">{formatBRL(revenue)}</p></div>
      </section>

      <section className={card}>
        <h2 className="font-bold">Comissão da plataforma</h2>
        <p className="mb-3 text-sm text-slate-500">Atual: {(rate * 100).toFixed(2).replace(".", ",")}% sobre o valor dos produtos. Vale para novos pedidos.</p>
        <form action={setCommission} className="flex gap-2">
          <input name="percent" defaultValue={(rate * 100).toString()} inputMode="decimal" className={`${input} w-28`} />
          <span className="py-2">%</span>
          <button className="rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark">Salvar</button>
        </form>
      </section>

      <section className={card}>
        <h2 className="mb-3 font-bold">Denúncias abertas ({reports.data?.length ?? 0})</h2>
        {reports.data && reports.data.length > 0 ? (
          <ul className="space-y-3 text-sm">
            {reports.data.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-medium">{(r.products as unknown as { name: string } | null)?.name ?? "Produto removido"}</p>
                <p className="text-slate-600">{r.reason}</p>
                <div className="mt-2 flex gap-2">
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="productId" value={r.product_id ?? ""} />
                    <input type="hidden" name="remove" value="1" />
                    <button className="rounded border border-red-200 px-3 py-1 text-red-700 hover:bg-red-50">Desativar anúncio</button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100">Ignorar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma denúncia aberta.</p>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-bold">Lojas</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {stores.data?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <a href={`/loja/${s.slug}`} className="font-medium hover:text-brand">{s.name}</a>
                {s.status === "suspended" && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">suspensa</span>}
              </span>
              <form action={setStoreStatus}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="status" value={s.status === "active" ? "suspended" : "active"} />
                <button className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100">
                  {s.status === "active" ? "Suspender" : "Reativar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 font-bold">Categorias</h2>
          <p className="mb-3 text-sm text-slate-600">{categories.data?.map((c) => c.name).join(", ")}</p>
          <form action={addCategory} className="flex gap-2">
            <input name="name" placeholder="Nova categoria" required className={`${input} flex-1`} />
            <button className="rounded-lg bg-brand px-4 font-semibold text-white hover:bg-brand-dark">Adicionar</button>
          </form>
        </div>
        <div className={card}>
          <h2 className="mb-3 font-bold">Destaques da página inicial</h2>
          <ul className="space-y-1 text-sm">
            {featuredCandidates.data?.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.name}</span>
                <form action={toggleFeatured}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="featured" value={String(p.featured)} />
                  <button className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-100">{p.featured ? "Remover" : "Destacar"}</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
