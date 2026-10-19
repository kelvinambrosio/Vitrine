import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateDelivery, formatDateBR, notifyBuyer } from "@/lib/notify";
import { getSellerToken } from "@/lib/mp";
import { markRefunded } from "@/lib/orders";

const UUID = /^[0-9a-f-]{36}$/i;

function validSignature(request: Request, dataId: string, secret: string): boolean {
  const header = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts: Record<string, string> = {};
  header.split(",").forEach((p) => {
    const [k, v] = p.trim().split("=");
    if (k && v) parts[k] = v;
  });
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order") ?? "";
  if (!UUID.test(orderId)) return NextResponse.json({ ok: true });

  let body: { type?: string; topic?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    // alguns avisos chegam sem corpo
  }
  const kind = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
  if (kind !== "payment" || !dataId) return NextResponse.json({ ok: true });

  // Assinatura do Mercado Pago (quando MP_WEBHOOK_SECRET está configurada)
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret && !validSignature(request, dataId, secret)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,store_id,status,total_cents,stores(handling_days,delivery_days)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  const sellerToken = await getSellerToken(order.store_id);
  if (!sellerToken) return NextResponse.json({ ok: true });

  // A confirmação real: perguntamos ao Mercado Pago o status do pagamento (nunca confiamos só no aviso)
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  if (!res.ok) return NextResponse.json({ error: "não foi possível consultar o pagamento" }, { status: 502 });
  const payment = (await res.json()) as {
    status?: string;
    external_reference?: string;
    transaction_amount?: number;
  };
  if (payment.external_reference !== order.id) return NextResponse.json({ ok: true });

  if (payment.status === "approved" && order.status === "pending") {
    // Confere o valor pago
    if (Math.round((payment.transaction_amount ?? 0) * 100) !== order.total_cents) {
      await admin.from("orders").update({ notes: "Valor pago diferente do total do pedido. Verificar." }).eq("id", order.id);
      return NextResponse.json({ ok: true });
    }

    const stores = order.stores as unknown as { handling_days: number; delivery_days: number };
    const estimate = estimateDelivery(new Date(), stores.handling_days, stores.delivery_days);

    // Só o primeiro aviso consegue mudar de "pending" para "paid" (evita processar duas vezes)
    const { data: updated } = await admin
      .from("orders")
      .update({ status: "paid", mp_payment_id: dataId, paid_at: new Date().toISOString(), estimated_delivery: estimate })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id");

    if (updated && updated.length > 0) {
      const { data: items } = await admin.from("order_items").select("product_id,quantity").eq("order_id", order.id);
      let stockProblem = false;
      for (const item of items ?? []) {
        if (!item.product_id) continue;
        const { data: ok } = await admin.rpc("decrement_stock", { p_product_id: item.product_id, p_qty: item.quantity });
        if (ok === false) stockProblem = true;
      }
      if (stockProblem) {
        await admin.from("orders").update({ notes: "Estoque insuficiente na confirmação. Falar com o comprador." }).eq("id", order.id);
      }
      await admin.from("order_events").insert({
        order_id: order.id,
        kind: "paid",
        description: "Pagamento confirmado. A loja está preparando seu pedido.",
      });
      await notifyBuyer(
        order.buyer_id,
        order.id,
        `Pagamento confirmado! Previsão de entrega: ${formatDateBR(estimate)}.`
      );
    }
  } else if ((payment.status === "refunded" || payment.status === "charged_back") && order.status !== "refunded") {
    await markRefunded(order.id, order.buyer_id);
  } else if ((payment.status === "cancelled" || payment.status === "rejected") && order.status === "pending") {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }

  return NextResponse.json({ ok: true });
}
