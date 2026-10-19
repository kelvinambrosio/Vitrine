import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { effectivePrice, formatBRL } from "@/lib/format";
import AddToCart from "@/components/AddToCart";
import Flash from "@/components/Flash";
import ProductCard from "@/components/ProductCard";
import Stars from "@/components/Stars";
import { reportProduct } from "./actions";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*, stores(id,name,slug,city,state,shipping_cents,handling_days,delivery_days), categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (!product) notFound();

  const store = product.stores;
  const price = effectivePrice(product);

  // Comparar preços: produtos de nome parecido em outras lojas (ignora caracteres especiais da busca)
  const term = product.name.replace(/[%_,()\\]/g, " ").trim().split(/\s+/).slice(0, 3).join(" ");
  const [{ data: similar }, { data: ratings }] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,price_cents,promo_price_cents,images,stock,stores(name,slug)")
      .eq("active", true)
      .neq("store_id", store.id)
      .ilike("name", `%${term}%`)
      .order("price_cents", { ascending: true })
      .limit(4),
    supabase.from("reviews").select("rating").eq("store_id", store.id),
  ]);
  const ratingCount = ratings?.length ?? 0;
  const ratingAvg = ratingCount > 0 ? ratings!.reduce((s, r) => s + r.rating, 0) / ratingCount : 0;
  const images: string[] = product.images ?? [];
  const minDays = store.handling_days + store.delivery_days;

  return (
    <div>
      <Flash erro={erro} ok={ok} />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-slate-300">🛍️</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.slice(1).map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {product.categories?.name && <p className="text-sm text-slate-500">{product.categories.name}</p>}
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <div>
            {product.promo_price_cents !== null && (
              <span className="mr-2 text-slate-400 line-through">{formatBRL(product.price_cents)}</span>
            )}
            <span className="text-3xl font-extrabold">{formatBRL(price)}</span>
          </div>

          <div className="rounded-xl bg-white p-4 text-sm text-slate-600">
            <p>
              Vendido por{" "}
              <Link href={`/loja/${store.slug}`} className="font-semibold text-brand hover:underline">
                {store.name}
              </Link>
              {store.city ? ` · ${store.city}${store.state ? "/" + store.state : ""}` : ""}
            </p>
            <p className="mt-1">
              {ratingCount > 0 ? <Stars value={ratingAvg} count={ratingCount} /> : <span className="text-slate-400">Loja ainda sem avaliações</span>}
            </p>
            <p className="mt-1">
              Frete: {store.shipping_cents > 0 ? formatBRL(store.shipping_cents) : "grátis"} · Entrega estimada em até{" "}
              <strong>{minDays} dias</strong> após o pagamento.
            </p>
          </div>

          <AddToCart
            productId={product.id}
            name={product.name}
            image={images[0] ?? null}
            priceCents={price}
            stock={product.stock}
            variants={product.variants ?? []}
            storeId={store.id}
            storeName={store.name}
            shippingCents={store.shipping_cents}
          />

          {product.description && (
            <div>
              <h2 className="mb-1 font-semibold">Descrição</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{product.description}</p>
            </div>
          )}

          <details className="text-sm text-slate-500">
            <summary className="cursor-pointer hover:text-slate-700">Denunciar este anúncio</summary>
            <form action={reportProduct} className="mt-2 space-y-2">
              <input type="hidden" name="productId" value={product.id} />
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={1000}
                placeholder="Explique o problema (produto falsificado, golpe, conteúdo proibido...)"
                className="w-full rounded-lg border border-slate-300 p-2"
                rows={3}
              />
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">Enviar denúncia</button>
            </form>
          </details>
        </div>
      </div>

      {similar && similar.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-xl font-bold">Compare em outras lojas</h2>
          <p className="mb-4 text-sm text-slate-500">Produtos parecidos, do menor para o maior preço.</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p as never} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("name,description,images").eq("id", id).maybeSingle();
  if (!data) return {};
  return {
    title: data.name,
    description: (data.description ?? "").slice(0, 160) || `Compre ${data.name} na Minha Vitrine.`,
    openGraph: { title: data.name, images: data.images?.[0] ? [data.images[0]] : [] },
  };
}
