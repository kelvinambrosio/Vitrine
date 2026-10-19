import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";

// Chamado pelos links enviados por e-mail pelo Supabase (confirmação de cadastro e recuperação de senha).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const next = safeNext(params.get("next"), "/painel");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${SITE_URL}${next}`);
  }
  return NextResponse.redirect(`${SITE_URL}/entrar?erro=${encodeURIComponent("Link inválido ou expirado. Tente entrar novamente.")}`);
}
