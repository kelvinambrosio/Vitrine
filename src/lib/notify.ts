import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";

/**
 * Avisa o comprador: grava um aviso no site e, se RESEND_API_KEY estiver configurada,
 * envia também um e-mail. Falhas aqui nunca derrubam a operação principal.
 */
export async function notifyBuyer(buyerId: string, orderId: string, message: string) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({ user_id: buyerId, order_id: orderId, message });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const { data } = await admin.auth.admin.getUserById(buyerId);
    const to = data.user?.email;
    if (!to) return;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Minha Vitrine <onboarding@resend.dev>",
        to,
        subject: "Atualização do seu pedido na Minha Vitrine",
        text: `${message}\n\nAcompanhe o pedido: ${SITE_URL}/pedidos/${orderId}`,
      }),
    });
  } catch {
    // silencioso de propósito
  }
}

/** Previsão: data do pagamento + dias para postar + prazo de entrega (em dias corridos). */
export function estimateDelivery(from: Date, handlingDays: number, deliveryDays: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + handlingDays + deliveryDays);
  return d.toISOString().slice(0, 10);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const EVENT_LABEL: Record<string, string> = {
  paid: "Pagamento confirmado",
  posted: "Pedido postado",
  in_transit: "Em trânsito",
  out_for_delivery: "Saiu para entrega",
  delivery_attempt_failed: "Tentativa de entrega sem sucesso",
  delivered: "Entregue",
  info: "Atualização",
};
