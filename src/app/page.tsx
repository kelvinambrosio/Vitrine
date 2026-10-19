import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
import Flash from "@/components/Flash";

const PRODUCT_COLUMNS = "id,name,price_cents,promo_price_cents,images,stock,stores(name,slug)";

export default async function Home({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const supabase = await createClient();

  const [cats, deals, featured, latest, stores] = await Promise.all([
    supabase.from("categories").select("id,slug,name").order("name"),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .not("promo_price_cents", "is", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("products").select(PRODUCT_COLUMNS).eq("active", true).eq("featured", true).limit(8),
    supabase.from("products").select(PRODUCT_COLUMNS).eq("active", true).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("stores")
      .select("id,slug,name,description,logo_url,city,state")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const highlight = featured.data && featured.data.length > 0 ? featured.data : latest.data ?? [];
  const highlightTitle = featured.data && featured.data.length > 0 ? "Produtos em destaque" : "Novidades";

  return (
    <div className="space-y-12">
      <Flash ok={ok} erro={erro} />
      {/* Banner principal */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-emerald-500 p-8 text-white md:p-14">
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
          Compre de lojas de todo o Brasil. Venda a sua, de graça.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-emerald-50">
          Sem mensalidade: você só paga 5% quando vende. Abra sua loja em minutos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/vender" className="rounded-xl bg-white px-6 py-3 font-semibold text-brand hover:bg-brand-soft">
            Abrir minha loja grátis
          </Link>
          <Link href="/busca" className="rounded-xl border border-white/60 px-6 py-3 font-semibold hover:bg-white/10">
            Ver produtos
          </Link>
        </div>
      </section>

      {/* Categorias */}
      {cats.data && cats.data.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Categorias</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {cats.data.map((c) => (
              <Link
                key={c.id}
                href={`/busca?categoria=${c.slug}`}
                className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium hover:border-brand hover:text-brand"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ofertas */}
      {deals.data && deals.data.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">Ofertas</h2>
            <Link href="/busca?ordem=menor-preco" className="text-sm text-brand hover:underline">Ver mais</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {deals.data.map((p) => (
              <ProductCard key={p.id} product={p as never} />
            ))}
          </div>
        </section>
      )}

      {/* Destaques */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{highlightTitle}</h2>
        {highlight.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {highlight.map((p) => (
              <ProductCard key={p.id} product={p as never} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Ainda não há produtos. Seja a primeira loja da Minha Vitrine!{" "}
            <Link href="/vender" className="font-semibold text-brand underline">Abrir loja grátis</Link>
          </div>
        )}
      </section>

      {/* Lojas recomendadas */}
      {stores.data && stores.data.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Lojas recomendadas</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {stores.data.map((s) => (
              <Link
                key={s.id}
                href={`/loja/${s.slug}`}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
              >
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt={s.name} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-xl font-bold text-brand">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[s.city, s.state].filter(Boolean).join(" - ") || "Brasil"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Confiança */}
      <section className="grid gap-4 rounded-2xl bg-white p-6 text-sm text-slate-600 md:grid-cols-3">
        <p><strong className="block text-slate-900">Pagamento seguro</strong>Pix, cartão e boleto pelo Mercado Pago.</p>
        <p><strong className="block text-slate-900">Lojas avaliadas</strong>Só quem recebeu o pedido pode avaliar a loja.</p>
        <p><strong className="block text-slate-900">Denuncie anúncios</strong>Viu algo errado? Use o botão de denúncia no produto.</p>
      </section>
    </div>
  );
}
