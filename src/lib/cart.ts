// Carrinho guardado no navegador. Os preços daqui são só para exibição:
// no pagamento o servidor busca o preço real de cada produto no banco.

export type CartItem = {
  productId: string;
  variant: string | null;
  name: string;
  image: string | null;
  priceCents: number;
  qty: number;
  stock: number;
};

export type Cart = {
  storeId: string | null;
  storeName: string | null;
  shippingCents: number;
  items: CartItem[];
};

const KEY = "mv_cart_v1";
const EMPTY: Cart = { storeId: null, storeName: null, shippingCents: 0, items: [] };

export function readCart(): Cart {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.items)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function writeCart(cart: Cart) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // armazenamento indisponível
  }
  window.dispatchEvent(new Event("cart-updated"));
}

export function clearCart() {
  writeCart(EMPTY);
}
