import Link from "next/link";
import { effectivePrice, formatBRL } from "@/lib/format";

type CardProduct = {
  id: string;
  name: string;
  price_cents: number;
  promo_price_cents: number | null;
  images: string[] | null;
  stock: number;
  stores?: { name: string; slug: string } | null;
};

export default function ProductCard({ product }: { product: CardProduct }) {
  const price = effectivePrice(product);
  const onSale = product.promo_price_cents !== null;
  const image = product.images?.[0];

  return (
    <Link
      href={`/produto/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-slate-300">🛍️</div>
        )}
        {onSale && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
            Oferta
          </span>
        )}
        {product.stock <= 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-center text-xs text-white">
            Esgotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium group-hover:text-brand">{product.name}</h3>
        <div className="mt-auto">
          {onSale && <span className="mr-2 text-xs text-slate-400 line-through">{formatBRL(product.price_cents)}</span>}
          <span className="text-base font-bold">{formatBRL(price)}</span>
        </div>
        {product.stores && <span className="text-xs text-slate-500">{product.stores.name}</span>}
      </div>
    </Link>
  );
}
