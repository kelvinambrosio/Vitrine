"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireUser("/conta");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") {
    redirect(`/conta?erro=${encodeURIComponent('Digite EXCLUIR para confirmar.')}`);
  }

  const admin = createAdminClient();
  const { data: store } = await admin.from("stores").select("id").eq("owner_id", user.id).maybeSingle();
  if (store) {
    redirect(`/conta?erro=${encodeURIComponent("Você tem uma loja. Para encerrá-la e excluir a conta, fale com o suporte.")}`);
  }

  const { count } = await admin.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", user.id);

  if ((count ?? 0) === 0) {
    // Sem pedidos: exclusão completa (perfil, avisos e avaliações saem junto).
    await admin.auth.admin.deleteUser(user.id);
  } else {
    // Com pedidos: a lei exige guardar os dados fiscais da compra. Anonimizamos o perfil e bloqueamos o acesso.
    await admin.from("profiles").update({ full_name: "Usuário removido" }).eq("id", user.id);
    await admin.from("notifications").delete().eq("user_id", user.id);
    await admin.auth.admin.updateUserById(user.id, {
      email: `removido-${user.id}@invalid.local`,
      email_confirm: true,
      ban_duration: "876000h",
    });
  }

  await supabase.auth.signOut();
  redirect(`/?ok=${encodeURIComponent("Sua conta foi encerrada.")}`);
}
