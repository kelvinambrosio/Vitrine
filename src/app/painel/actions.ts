"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMyStore, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMoneyToCents, slugify } from "@/lib/format";
import { uploadImage } from "@/lib/upload";
import { EVENT_LABEL, formatDateBR, notifyBuyer } from "@/lib/notify";
import { refundOrder } from "@/lib/orders";

function go(kind: "erro" | "ok", msg: string, path = "/painel"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);
}

function intInRange(value: FormDataEntryValue | null, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

export async function createStore(formData: FormData) {
  const { supabase, user } = await requireUser("/painel");

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const city = String(formData.get("city") ?? "").trim().slice(0, 60);
  const state = String(formData.get("state") ?? "").trim().toUpperCase().slice(0, 2);
  const shipping = parseMoneyToCents(String(formData.get("shipping") ?? "0"), true);
  const slug = slugify(name);

  if (name.length < 3 || !slug) go("erro", "Dê um nome à loja (mínimo 3 letras).");
  if (shipping === null) go("erro", "Valor de frete inválido.");

  const logo = await uploadImage(supabase, user.id, formData.get("logo") as File | null, "logo");

  const { error } = await supabase.from("stores").insert({
    owner_id: user.id,
    slug,
    name,
    description: description || null,
    city: city || null,
    state: state || null,
    logo_url: logo,
    shipping_cents: shipping,
    handling_days: intInRange(formData.get("handling_days"), 0, 30, 2),
    delivery_days: intInRange(formData.get("delivery_days"), 1, 60, 7),
  });
  if (error) {
    go("erro", error.code === "23505" ? "Já existe uma loja com esse nome ou você já tem uma loja. Escolha outro nome." : "Não foi possível criar a loja.");
  }

  // Marca o usuário como vendedor (o usuário não consegue mudar o próprio papel pelo navegador)
  await createAdminClient().from("profiles").update({ role: "seller" }).eq("id", user.id).neq("role", "admin");
  go("ok", "Loja criada! Agora conecte o Mercado Pago e cadastre seus produtos.");
}

export async function updateStore(formData: FormData) {
  const { supabase, user } = await requireUser("/painel");
  const store = await getMyStore(supabase, user.id);
  if (!store) go("erro", "Loja não encontrada.");

  const shipping = parseMoneyToCents(String(formData.get("shipping") ?? "0"), true);
  if (shipping === null) go("erro", "Valor de frete inválido.");

  const patch: Record<string, unknown> = {
    description: String(formData.get("description") ?? "").trim().slice(0, 1000) || null,
    shipping_cents: shipping,
    handling_days: intInRange(formData.get("handling_days"), 0, 30, store.handling_days),
    delivery_days: intInRange(formData.get("delivery_days"), 1, 60, store.delivery_days),
  };
  const logo = await uploadImage(supabase, user.id, formData.get("logo") as File | null, "logo");
  if (logo) patch.logo_url = logo;

  const { error } = await supabase.from("stores").update(patch).eq("id", store.id);
  if (error) go("erro", "Não foi possível salvar.");
  revalidatePath("/painel");
  go("ok", "Loja atualizada.");
}

export async function createProduct(formData: FormData) {
  const { supabase, user } = await requireUser("/painel/produtos/novo");
  const store = await getMyStore(supabase, user.id);
  if (!store) go("erro", "Crie sua loja primeiro.");
  if (store.status !== "active") go("erro", "Sua loja está suspensa. Fale com o suporte.");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000);
  const price = parseMoneyToCents(String(formData.get("price") ?? ""));
  const promoRaw = String(formData.get("promo") ?? "").trim();
  const promo = promoRaw ? parseMoneyToCents(promoRaw) : null;
  const stock = intInRange(formData.get("stock"), 0, 100000, -1);
  const categoryId = Number(formData.get("category_id"));
  const variants = String(formData.get("variants") ?? "")
    .split(",")
    .map((v) => v.trim().slice(0, 30))
    .filter(Boolean)
    .slice(0, 20);

  const back = "/painel/produtos/novo";
  if (name.length < 3) go("erro", "Dê um nome ao produto (mínimo 3 letras).", back);
  if (price === null) go("erro", "Preço inválido.", back);
  if (promoRaw && (promo === null || promo >= price)) go("erro", "O preço promocional deve ser menor que o preço normal.", back);
  if (stock < 0) go("erro", "Estoque inválido.", back);

  const files = (formData.getAll("photos") as File[]).filter((f) => f && f.size > 0).slice(0, 5);
  const images: string[] = [];
  for (const file of files) {
    const url = await uploadImage(supabase, user.id, file, "produto");
    if (url) images.push(url);
  }
  if (files.length > 0 && images.length === 0) {
    go("erro", "As fotos não puderam ser enviadas. Use JPG, PNG ou WEBP de até 4 MB.", back);
  }

  const { error } = await supabase.from("products").insert({
    store_id: store.id,
    category_id: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null,
    name,
    description: description || null,
    price_cents: price,
    promo_price_cents: promo,
    stock,
    images,
    variants,
  });
  if (error) go("erro", "Não foi possível salvar o produto.", back);
  go("ok", "Produto cadastrado!");
}

export async function updateStock(formData: FormData) {
  const { supabase } = await requireUser("/painel");
  const id = String(formData.get("id") ?? "");
  const stock = intInRange(formData.get("stock"), 0, 100000, -1);
  if (stock < 0) go("erro", "Estoque inválido.");
  const { error } = await supabase.from("products").update({ stock }).eq("id", id);
  if (error) go("erro", "Não foi possível atualizar o estoque.");
  revalidatePath("/painel");
  go("ok", "Estoque atualizado.");
}

export async function toggleProduct(formData: FormData) {
  const { supabase } = await requireUser("/painel");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await supabase.from("products").update({ active: !active }).eq("id", id);
  revalidatePath("/painel");
  go("ok", active ? "Produto pausado." : "Produto reativado.");
}

export async function deleteProduct(formData: FormData) {
  const { supabase } = await requireUser("/painel");
  const id = String(formData.get("id") ?? "");
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/painel");
  go("ok", "Produto removido.");
}

/** O vendedor reembolsa um pedido da própria loja (o Mercado Pago devolve o valor ao comprador). */
export async function refundMyOrder(formData: FormData) {
  const { supabase, user } = await requireUser("/painel");
  const store = await getMyStore(supabase, user.id);
  if (!store) go("erro", "Loja não encontrada.");
  const result = await refundOrder(String(formData.get("orderId") ?? ""), store.id);
  revalidatePath("/painel");
  go(result.ok ? "ok" : "erro", result.message);
}

const EVENT_KINDS = ["posted", "in_transit", "out_for_delivery", "delivery_attempt_failed", "delivered", "info"];

/** O vendedor registra cada parada do pedido. O comprador é avisado a cada registro. */
export async function addTrackingEvent(formData: FormData) {
  const { supabase, user } = await requireUser("/painel");
  const store = await getMyStore(supabase, user.id);
  if (!store) go("erro", "Loja não encontrada.");

  const orderId = String(formData.get("orderId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const location = String(formData.get("location") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const trackingCode = String(formData.get("tracking_code") ?? "").trim().slice(0, 40);
  const carrier = String(formData.get("carrier") ?? "").trim().slice(0, 40);
  const estimate = String(formData.get("estimated_delivery") ?? "").trim();

  if (!EVENT_KINDS.includes(kind)) go("erro", "Escolha o tipo de atualização.");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,store_id,status,estimated_delivery")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.store_id !== store.id) go("erro", "Pedido não encontrado.");
  if (!["paid", "shipped"].includes(order.status)) go("erro", "Só é possível atualizar pedidos pagos que ainda não foram entregues.");

  const patch: Record<string, unknown> = {};
  if (kind === "posted") {
    patch.status = "shipped";
    if (trackingCode) patch.tracking_code = trackingCode;
    if (carrier) patch.carrier = carrier;
  }
  if (kind === "delivered") patch.status = "delivered";
  let finalEstimate: string | null = order.estimated_delivery;
  if (/^\d{4}-\d{2}-\d{2}$/.test(estimate)) {
    patch.estimated_delivery = estimate;
    finalEstimate = estimate;
  }
  if (Object.keys(patch).length > 0) await admin.from("orders").update(patch).eq("id", order.id);

  const label = EVENT_LABEL[kind];
  const description = [label, location ? `em ${location}` : ""].filter(Boolean).join(" ") + (note ? `. ${note}` : "");
  await admin.from("order_events").insert({ order_id: order.id, kind, location: location || null, description });

  const eta = kind !== "delivered" && finalEstimate ? ` Previsão de entrega: ${formatDateBR(finalEstimate)}.` : "";
  await notifyBuyer(order.buyer_id, order.id, `${description}.${eta}`.replace("..", "."));

  revalidatePath("/painel");
  go("ok", "Atualização registrada e o cliente foi avisado.");
}
