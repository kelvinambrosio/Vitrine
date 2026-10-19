export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte "49,90", "1.234,56" ou "49.90" em centavos. Retorna null se inválido. */
export function parseMoneyToCents(input: string, allowZero = false): number | null {
  let s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) return null;
  return Math.round(n * 100);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function effectivePrice(p: { price_cents: number; promo_price_cents: number | null }): number {
  return p.promo_price_cents ?? p.price_cents;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago, aguardando envio",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
