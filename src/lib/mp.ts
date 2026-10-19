import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Devolve o token do Mercado Pago do vendedor. Os tokens expiram (cerca de 6 meses):
 * quando falta pouco, renovamos automaticamente com o refresh_token.
 */
export async function getSellerToken(storeId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: acc } = await admin
    .from("store_payment_accounts")
    .select("access_token,refresh_token,expires_at")
    .eq("store_id", storeId)
    .maybeSingle();
  if (!acc) return null;

  const expiresSoon = acc.expires_at ? new Date(acc.expires_at).getTime() - Date.now() < 7 * 24 * 3600 * 1000 : false;
  if (!expiresSoon || !acc.refresh_token) return acc.access_token;

  try {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: acc.refresh_token,
      }),
    });
    if (res.ok) {
      const t = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
      if (t.access_token) {
        await admin
          .from("store_payment_accounts")
          .update({
            access_token: t.access_token,
            refresh_token: t.refresh_token ?? acc.refresh_token,
            expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : acc.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", storeId);
        return t.access_token;
      }
    }
  } catch {
    // usa o token atual
  }
  return acc.access_token;
}

/** Reembolso total de um pagamento no Mercado Pago. */
export async function refundPayment(token: string, paymentId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: "{}",
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? `Mercado Pago respondeu ${res.status}` };
  } catch {
    return { ok: false, error: "Falha de conexão com o Mercado Pago." };
  }
}
