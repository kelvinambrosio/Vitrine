import { createAdminClient } from "@/lib/supabase/admin";
import { getSellerToken, refundPayment } from "@/lib/mp";
import { notifyBuyer } from "@/lib/notify";

/** Marca como reembolsado, devolve o estoque e avisa o comprador. Só age uma vez por pedido. */
export async function markRefunded(orderId: string, buyerId: string) {
  const admin = createAdminClient();
  const { data: updated } = await admin
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId)
    .neq("status", "refunded")
    .select("id");
  if (!updated || updated.length === 0) return;

  const { data: items } = await admin.from("order_items").select("product_id,quantity").eq("order_id", orderId);
  for (const item of items ?? []) {
    if (item.product_id) await admin.rpc("increment_stock", { p_product_id: item.product_id, p_qty: item.quantity });
  }
  await admin.from("order_events").insert({ order_id: orderId, kind: "info", description: "Pagamento reembolsado." });
  await notifyBuyer(buyerId, orderId, "O pagamento do seu pedido foi reembolsado.");
}

/**
 * Reembolsa um pedido pago pelo Mercado Pago.
 * Se allowedStoreId for informado, só reembolsa pedidos dessa loja (uso do vendedor).
 */
export async function refundOrder(orderId: string, allowedStoreId?: string): Promise<{ ok: boolean; message: string }> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,store_id,status,mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || (allowedStoreId && order.store_id !== allowedStoreId)) return { ok: false, message: "Pedido não encontrado." };
  if (!["paid", "shipped", "delivered"].includes(order.status) || !order.mp_payment_id) {
    return { ok: false, message: "Este pedido não pode ser reembolsado." };
  }

  const token = await getSellerToken(order.store_id);
  if (!token) return { ok: false, message: "Conta do Mercado Pago da loja não encontrada." };

  const result = await refundPayment(token, order.mp_payment_id);
  if (!result.ok) return { ok: false, message: `Não foi possível reembolsar: ${result.error}` };

  await markRefunded(order.id, order.buyer_id);
  return { ok: true, message: "Reembolso solicitado ao Mercado Pago e pedido marcado como reembolsado." };
}
