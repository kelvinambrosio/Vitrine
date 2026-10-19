"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearCart, readCart, writeCart, type Cart } from "@/lib/cart";
import { formatBRL } from "@/lib/format";

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand";

export default function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(readCart());
  }, []);

  if (!cart) return <p className="text-slate-500">Carregando…</p>;

  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-slate-500">Seu carrinho está vazio.</p>
        <Link href="/busca" className="mt-3 inline-block font-semibold text-brand underline">
          Ver produtos
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const total = subtotal + cart.shippingCents;

  function update(next: Cart) {
    setCart(next);
    writeCart(next);
  }

  function changeQty(index: number, qty: number) {
    if (!cart) return;
    const items = cart.items.map((i, idx) => (idx === index ? { ...i, qty: Math.max(1, Math.min(i.stock, qty)) } : i));
    update({ ...cart, items });
  }

  function remove(index: number) {
    if (!cart) return;
    const items = cart.items.filter((_, idx) => idx !== index);
    update({ ...cart, items, storeId: items.length ? cart.storeId : null });
  }

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart) return;
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const address = Object.fromEntries(
      ["name", "cep", "street", "number", "complement", "district", "city", "state"].map((k) => [k, String(form.get(k) ?? "").trim()])
    );

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ productId: i.productId, variant: i.variant, qty: i.qty })),
          address,
          method: String(form.get("method") ?? "all"),
        }),
      });
      if (res.status === 401) {
        window.location.href = `/entrar?erro=${encodeURIComponent("Entre para finalizar a compra.")}&next=/carrinho`;
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.");
        setLoading(false);
        return;
      }
      clearCart();
      window.location.href = data.url;
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px]">
      <section>
        <h1 className="mb-1 text-xl font-bold">Carrinho</h1>
        <p className="mb-4 text-sm text-slate-500">Loja: {cart.storeName}</p>
        <ul className="space-y-3">
          {cart.items.map((i, idx) => (
            <li key={`${i.productId}-${i.variant}`} className="flex gap-4 rounded-xl bg-white p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {i.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.name}</p>
                {i.variant && <p className="text-xs text-slate-500">Opção: {i.variant}</p>}
                <p className="text-sm font-semibold">{formatBRL(i.priceCents)}</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <input
                    type="number"
                    min={1}
                    max={i.stock}
                    value={i.qty}
                    onChange={(e) => changeQty(idx, Number(e.target.value) || 1)}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                  />
                  <button onClick={() => remove(idx)} className="text-red-600 hover:underline">
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={checkout} className="h-fit space-y-3 rounded-2xl bg-white p-5">
        <h2 className="font-bold">Entrega e pagamento</h2>
        <input name="name" required placeholder="Nome de quem recebe" className={input} autoComplete="name" />
        <input name="cep" required placeholder="CEP" inputMode="numeric" maxLength={9} className={input} autoComplete="postal-code" />
        <input name="street" required placeholder="Rua" className={input} autoComplete="address-line1" />
        <div className="grid grid-cols-2 gap-2">
          <input name="number" required placeholder="Número" className={input} />
          <input name="complement" placeholder="Complemento" className={input} />
        </div>
        <input name="district" required placeholder="Bairro" className={input} />
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <input name="city" required placeholder="Cidade" className={input} />
          <input name="state" required placeholder="UF" maxLength={2} className={input} />
        </div>

        <fieldset className="space-y-2 border-t border-slate-100 pt-3 text-sm">
          <legend className="mb-1 font-semibold">Forma de pagamento</legend>
          {[
            ["all", "Todas as formas (escolho no Mercado Pago)"],
            ["pix", "Pix (aprovação na hora)"],
            ["card", "Cartão de crédito ou débito (parcele em até 12x)"],
            ["boleto", "Boleto (aprova em 1 a 3 dias úteis)"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-start gap-2">
              <input type="radio" name="method" value={value} defaultChecked={value === "all"} className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>

        <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><dt>Produtos</dt><dd>{formatBRL(subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt>Frete</dt>
            <dd>{cart.shippingCents > 0 ? formatBRL(cart.shippingCents) : "Grátis"}</dd>
          </div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatBRL(total)}</dd></div>
        </dl>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Abrindo pagamento…" : "Pagar com Pix, cartão ou boleto"}
        </button>
        <p className="text-center text-xs text-slate-400">
          Você será levado ao Mercado Pago. O pedido só é confirmado depois que o pagamento for aprovado.
        </p>
      </form>
    </div>
  );
}
