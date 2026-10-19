"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/format";
import { refundOrder } from "@/lib/orders";

function go(kind: "erro" | "ok", msg: string): never {
  redirect(`/admin?${kind}=${encodeURIComponent(msg)}`);
}

export async function setCommission(formData: FormData) {
  await requireAdmin();
  const percent = Number(String(formData.get("percent") ?? "").replace(",", "."));
  if (!Number.isFinite(percent) || percent < 0 || percent > 50) go("erro", "Informe um percentual entre 0 e 50.");
  await createAdminClient().from("platform_settings").upsert({ key: "commission_rate", value: String(percent / 100) });
  revalidatePath("/admin");
  go("ok", `Comissão atualizada para ${percent}%. Vale para novos pedidos.`);
}

export async function setStoreStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "suspended"].includes(status)) go("erro", "Status inválido.");
  await createAdminClient().from("stores").update({ status }).eq("id", id);
  revalidatePath("/admin");
  go("ok", status === "suspended" ? "Loja suspensa." : "Loja reativada.");
}

export async function resolveReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const removeProduct = formData.get("remove") === "1";
  const productId = String(formData.get("productId") ?? "");
  const admin = createAdminClient();
  if (removeProduct && productId) await admin.from("products").update({ active: false }).eq("id", productId);
  await admin.from("reports").update({ status: "resolved" }).eq("id", id);
  revalidatePath("/admin");
  go("ok", removeProduct ? "Anúncio desativado e denúncia resolvida." : "Denúncia resolvida.");
}

export async function setUserBan(formData: FormData) {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const ban = formData.get("ban") === "1";
  if (id === user.id) go("erro", "Você não pode bloquear a si mesmo.");
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { ban_duration: ban ? "876000h" : "none" });
  if (error) go("erro", "Não foi possível alterar o usuário.");
  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios?ok=${encodeURIComponent(ban ? "Usuário bloqueado." : "Usuário liberado.")}`);
}

export async function adminRefund(formData: FormData) {
  await requireAdmin();
  const result = await refundOrder(String(formData.get("orderId") ?? ""));
  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos?${result.ok ? "ok" : "erro"}=${encodeURIComponent(result.message)}`);
}

export async function addCategory(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const slug = slugify(name);
  if (!name || !slug) go("erro", "Nome inválido.");
  const { error } = await createAdminClient().from("categories").insert({ name, slug });
  if (error) go("erro", "Essa categoria já existe.");
  revalidatePath("/admin");
  go("ok", "Categoria criada.");
}

export async function toggleFeatured(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const featured = formData.get("featured") === "true";
  await createAdminClient().from("products").update({ featured: !featured }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  go("ok", featured ? "Removido dos destaques." : "Produto em destaque na página inicial.");
}
