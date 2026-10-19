import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("name,description").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!data) return {};
  return { title: data.name, description: (data.description ?? "").slice(0, 160) || `Loja ${data.name} na Minha Vitrine.` };
}

export default async function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase.from("stores").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!store) notFound();

  const [{ data: products }, { data: reviews }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,price_cents,promo_price_cents,images,stock")
      .eq("store_id", store.id)
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id,rating,comment,created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const count = reviews?.length ?? 0;
  const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-6">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo_url} alt={store.name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-3xl font-bold text-brand">
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <p className="text-sm text-slate-500">
            {[store.city, store.state].filter(Boolean).join(" - ") || "Brasil"}
          </p>
          <div className="mt-1">
            {count > 0 ? <Stars value={avg} count={count} /> : <span className="text-sm text-slate-400">Ainda sem avaliações</span>}
          </div>
        </div>
        {store.description && <p className="w-full whitespace-pre-line text-sm text-slate-600">{store.description}</p>}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Produtos da loja</h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Esta loja ainda não tem produtos.</p>
        )}
      </section>

      {reviews && reviews.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Avaliações de compradores</h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 text-sm">
                <Stars value={r.rating} />
                {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
