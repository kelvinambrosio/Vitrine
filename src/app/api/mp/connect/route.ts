import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/config";

// O vendedor clica em "Conectar Mercado Pago" no painel e é levado até aqui.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/entrar?next=/painel`);

  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", user.id).maybeSingle();
  if (!store) return NextResponse.redirect(`${SITE_URL}/painel`);

  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${SITE_URL}/painel?erro=${encodeURIComponent("Mercado Pago ainda não configurado pelo administrador.")}`);
  }

  const nonce = randomBytes(16).toString("hex");
  const state = `${store.id}.${nonce}`;
  const redirectUri = `${SITE_URL}/api/mp/callback`;
  const authUrl =
    `https://auth.mercadopago.com.br/authorization?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code&platform_id=mp&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    secure: SITE_URL.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
