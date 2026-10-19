"use client";

import { useState } from "react";
import { readCart, writeCart, type CartItem } from "@/lib/cart";

type Props = {
  productId: string;
  name: string;
  image: string | null;
  priceCents: number;
  stock: number;
  variants: string[];
  storeId: string;
  storeName: string;
  shippingCents: number;
};

export default function AddToCart(p: Props) {
  const [variant, setVariant] = useState<string>(p.variants[0] ?? "");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  function add() {
    const cart = readCart();
    if (cart.storeId && cart.storeId !== p.storeId && cart.items.length > 0) {
      const ok = window.confirm(
        `Seu carrinho tem itens de "${cart.storeName}". Cada pedido é de uma loja só. Esvaziar o carrinho e adicionar este produto?`
      );
      if (!ok) return;
      cart.items = [];
    }
    const v = p.variants.length > 0 ? variant : null;
    const existing = cart.items.find((i) => i.productId === p.productId && i.variant === v);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, p.stock);
    } else {
      const item: CartItem = {
        productId: p.productId,
        variant: v,
        name: p.name,
        image: p.image,
        priceCents: p.priceCents,
        qty: Math.min(qty, p.stock),
        stock: p.stock,
      };
      cart.items.push(item);
    }
    cart.storeId = p.storeId;
    cart.storeName = p.storeName;
    cart.shippingCents = p.shippingCents;
    writeCart(cart);
    setMsg("Adicionado ao carrinho!");
  }

  if (p.stock <= 0) {
    return <p className="rounded-lg bg-slate-100 p-3 text-center font-medium text-slate-500">Produto esgotado</p>;
  }

  return (
    <div className="space-y-3">
      {p.variants.length > 0 && (
        <label className="block text-sm">
          Opção
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {p.variants.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm">
        Quantidade
        <input
          type="number"
          min={1}
          max={p.stock}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))}
          className="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <button onClick={add} className="w-full rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
        Adicionar ao carrinho
      </button>
      {msg && (
        <p className="text-sm text-emerald-700">
          {msg}{" "}
          <a href="/carrinho" className="font-semibold underline">
            Ir para o carrinho
          </a>
        </p>
      )}
    </div>
  );
}
