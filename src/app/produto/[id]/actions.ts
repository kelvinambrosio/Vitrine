"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function reportProduct(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  const { supabase, user } = await requireUser(`/produto/${productId}`);

  if (reason.length < 10) {
    redirect(`/produto/${productId}?erro=${encodeURIComponent("Descreva o motivo da denúncia com pelo menos 10 caracteres.")}`);
  }
  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, product_id: productId, reason });
  if (error) redirect(`/produto/${productId}?erro=${encodeURIComponent("Não foi possível enviar a denúncia.")}`);
  redirect(`/produto/${productId}?ok=${encodeURIComponent("Denúncia enviada. Nossa equipe vai analisar.")}`);
}
