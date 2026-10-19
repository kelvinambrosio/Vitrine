"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart } from "@/lib/cart";

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(readCart().items.reduce((n, i) => n + i.qty, 0));
    update();
    window.addEventListener("cart-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Link href="/carrinho" className="relative rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100">
      🛒 Carrinho
      {count > 0 && (
        <span className="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}
