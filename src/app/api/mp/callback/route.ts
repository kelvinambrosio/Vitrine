import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";

function toPainel(kind: "ok" | "erro", msg: string) {
  const res = NextResponse.redirect(`${SITE_URL}/painel?${kind}=${encodeURIComponent(msg)}`);
  res.cookies.delete("mp_oauth_state");
  return res;
}

// O Mercado Pago devolve o vendedor para cá com um "code" que trocamos pelas credenciais da conta dele.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const saved = request.cookies.get("mp_oauth_state")?.value;

  if (!code || !state || !saved || state !== saved) {
    return toPainel("erro", "Não foi possível confirmar a conexão com o Mercado Pago. Tente novamente.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/entrar?next=/painel`);

  const storeId = state.split(".")[0];
  const { data: store } = await supabase.from("stores").select("id").eq("id", storeId).eq("owner_id", user.id).maybeSingle();
  if (!store) return toPainel("erro", "Loja não encontrada para esta conexão.");

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${SITE_URL}/api/mp/callback`,
    }),
  });
  if (!res.ok) return toPainel("erro", "O Mercado Pago recusou a conexão. Tente novamente.");

  const token = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    user_id?: number | string;
    expires_in?: number;
  };
  if (!token.access_token) return toPainel("erro", "Resposta inesperada do Mercado Pago.");

  const admin = createAdminClient();
  await admin.from("store_payment_accounts").upsert({
    store_id: store.id,
    mp_user_id: token.user_id ? String(token.user_id) : null,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });

  return toPainel("ok", "Mercado Pago conectado! Sua loja já pode receber pagamentos.");
}
