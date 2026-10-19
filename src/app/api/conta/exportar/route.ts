import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LGPD: o titular baixa uma cópia dos próprios dados.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

  const [profile, store, orders, reviews, notifications] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("stores").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("orders").select("*, order_items(*), order_events(*)").eq("buyer_id", user.id),
    supabase.from("reviews").select("*").eq("buyer_id", user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id),
  ]);

  const data = {
    exportado_em: new Date().toISOString(),
    conta: { id: user.id, email: user.email, criada_em: user.created_at },
    perfil: profile.data,
    loja: store.data,
    pedidos: orders.data,
    avaliacoes: reviews.data,
    avisos: notifications.data,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-minha-vitrine.json"',
    },
  });
}
