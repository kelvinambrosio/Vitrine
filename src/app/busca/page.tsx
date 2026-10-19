import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Buscar produtos" };

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoria?: string; ordem?: string }>;
}) {
  const { q, categoria, ordem } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase.from("categories").select("id,slug,name").order("name");
  const category = categories?.find((c) => c.slug === categoria);

  let query = supabase
    .from("products")
    .select("id,name,price_cents,promo_price_cents,images,stock,created_at,stores(name,slug)")
    .eq("active", true);

  // Remove caracteres que têm função especial na busca (% _ , ( ))
  const term = (q ?? "").replace(/[%_,()\\]/g, " ").trim();
  if (term) query = query.ilike("name", `%${term}%`);
  if (category) query = query.eq("category_id", category.id);

  if (ordem === "menor-preco") query = query.order("price_cents", { ascending: true });
  else if (ordem === "maior-preco") query = query.order("price_cents", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: products } = await query.limit(60);

  const link = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, categoria, ordem, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    return `/busca?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">
          {term ? `Resultados para “${term}”` : category ? category.name : "Todos os produtos"}
        </h1>
        <div className="flex gap-2 text-sm">
          <span className="py-1.5 text-slate-500">Ordenar:</span>
          {[
            ["", "Mais recentes"],
            ["menor-preco", "Menor preço"],
            ["maior-preco", "Maior preço"],
          ].map(([value, label]) => (
            <Link
              key={label}
              href={link({ ordem: value || undefined })}
              className={`rounded-full border px-3 py-1.5 ${
                (ordem ?? "") === value ? "border-brand bg-brand-soft text-brand" : "border-slate-300 bg-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as never} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Nenhum produto encontrado. Tente outra palavra ou veja as categorias no topo da página.
        </div>
      )}
    </div>
  );
}
