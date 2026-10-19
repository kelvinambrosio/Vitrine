import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rodado uma vez por dia pela Vercel (veja vercel.json). Cancela pedidos que ficaram sem pagamento por mais de 5 dias.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const limit = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
  const { data } = await createAdminClient()
    .from("orders")
    .update({ status: "cancelled", notes: "Cancelado automaticamente: pagamento não confirmado em 5 dias." })
    .eq("status", "pending")
    .lt("created_at", limit)
    .select("id");
  return NextResponse.json({ cancelled: data?.length ?? 0 });
}
