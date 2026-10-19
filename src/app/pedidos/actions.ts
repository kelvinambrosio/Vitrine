"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmDelivered(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const { user } = await requireUser(`/pedidos/${orderId}`);

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id,buyer_id,status").eq("id", orderId).maybeSingle();
  if (!order || order.buyer_id !== user.id || !["paid", "shipped"].includes(order.status)) {
    redirect(`/pedidos/${orderId}?erro=${encodeURIComponent("Não foi possível confirmar o recebimento.")}`);
  }
  await admin.from("orders").update({ status: "delivered" }).eq("id", orderId);
  await admin.from("order_events").insert({ order_id: orderId, kind: "delivered", description: "Recebimento confirmado pelo comprador." });
  revalidatePath(`/pedidos/${orderId}`);
  redirect(`/pedidos/${orderId}?ok=${encodeURIComponent("Obrigado! Que tal avaliar a loja?")}`);
}

export async function createReview(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const { supabase, user } = await requireUser(`/pedidos/${orderId}`);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`/pedidos/${orderId}?erro=${encodeURIComponent("Escolha uma nota de 1 a 5.")}`);
  }
  const { data: order } = await supabase.from("orders").select("store_id").eq("id", orderId).maybeSingle();
  if (!order) redirect(`/pedidos?erro=${encodeURIComponent("Pedido não encontrado.")}`);

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    store_id: order.store_id,
    buyer_id: user.id,
    rating,
    comment: comment || null,
  });
  if (error) redirect(`/pedidos/${orderId}?erro=${encodeURIComponent("Não foi possível enviar a avaliação (só pedidos entregues, uma vez cada).")}`);
  redirect(`/pedidos/${orderId}?ok=${encodeURIComponent("Avaliação enviada. Obrigado!")}`);
}

export async function markNotificationsRead() {
  const { supabase, user } = await requireUser("/pedidos");
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/pedidos");
  redirect("/pedidos");
}
