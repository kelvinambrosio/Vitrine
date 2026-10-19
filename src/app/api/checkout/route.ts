import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCommissionCents, getCommissionRate } from "@/lib/commission";
import { effectivePrice } from "@/lib/format";
import { SITE_URL } from "@/lib/config";
import { getSellerToken } from "@/lib/mp";

type Body = {
  items?: { productId?: string; variant?: string | null; qty?: number }[];
  address?: Record<string, string>;
  method?: string;
};

// Tipos de pagamento do Mercado Pago que NÃO queremos oferecer, conforme a escolha do comprador.
const EXCLUDED_BY_METHOD: Record<string, string[]> = {
  all: [],
  pix: ["credit_card", "debit_card", "prepaid_card", "ticket", "account_money"],
  card: ["ticket", "bank_transfer", "account_money", "atm"],
  boleto: ["credit_card", "debit_card", "prepaid_card", "bank_transfer", "account_money"],
};

const UUID = /^[0-9a-f-]{36}$/i;
const ADDRESS_FIELDS = ["name", "cep", "street", "number", "district", "city", "state"];

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // 1) Quem está comprando?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Entre na sua conta para finalizar a compra.", 401);

  // 2) Valida o pedido recebido (nunca confie em preços vindos do navegador)
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail("Pedido inválido.");
  }
  const items = body.items ?? [];
  const address = body.address ?? {};
  if (items.length === 0 || items.length > 30) return fail("Carrinho vazio ou grande demais.");
  for (const f of ADDRESS_FIELDS) {
    if (!address[f] || String(address[f]).trim().length === 0) return fail("Preencha todos os campos do endereço.");
  }
  if (!/^\d{5}-?\d{3}$/.test(address.cep)) return fail("CEP inválido.");
  for (const i of items) {
    if (!i.productId || !UUID.test(i.productId) || !Number.isInteger(i.qty) || (i.qty as number) < 1 || (i.qty as number) > 99) {
      return fail("Item inválido no carrinho.");
    }
  }

  // 3) Busca produtos reais no banco (com a chave de serviço, já que validamos tudo manualmente)
  const admin = createAdminClient();
  const ids = [...new Set(items.map((i) => i.productId as string))];
  const { data: products } = await admin
    .from("products")
    .select("id,store_id,name,price_cents,promo_price_cents,stock,active,variants")
    .in("id", ids);
  if (!products || products.length !== ids.length) return fail("Algum produto não está mais disponível.");

  const storeIds = new Set(products.map((p) => p.store_id));
  if (storeIds.size !== 1) return fail("O pedido deve conter produtos de uma única loja.");
  const storeId = products[0].store_id as string;

  const { data: store } = await admin
    .from("stores")
    .select("id,name,owner_id,status,shipping_cents,handling_days,delivery_days")
    .eq("id", storeId)
    .maybeSingle();
  if (!store || store.status !== "active") return fail("Esta loja não está disponível no momento.");
  if (store.owner_id === user.id) return fail("Você não pode comprar da sua própria loja.");

  const sellerToken = await getSellerToken(storeId);
  if (!sellerToken) return fail("Esta loja ainda não ativou o recebimento de pagamentos. Tente mais tarde.");

  // Antifraude básico: limita pedidos pendentes recentes por comprador (evita travar estoque/abusar)
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: pendingCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .gte("created_at", since);
  if ((pendingCount ?? 0) >= 5) return fail("Você tem vários pedidos aguardando pagamento. Conclua ou aguarde antes de criar outro.", 429);

  // 4) Calcula valores no servidor
  const orderItems: { product_id: string; name: string; variant: string | null; unit_price_cents: number; quantity: number }[] = [];
  for (const i of items) {
    const p = products.find((x) => x.id === i.productId)!;
    if (!p.active) return fail(`"${p.name}" não está mais disponível.`);
    const variant = i.variant ? String(i.variant) : null;
    if ((p.variants as string[]).length > 0 && (!variant || !(p.variants as string[]).includes(variant))) {
      return fail(`Escolha uma opção válida para "${p.name}".`);
    }
    const sameLines = orderItems.filter((o) => o.product_id === p.id).reduce((n, o) => n + o.quantity, 0);
    if (p.stock < sameLines + (i.qty as number)) return fail(`Estoque insuficiente para "${p.name}".`);
    orderItems.push({
      product_id: p.id,
      name: p.name,
      variant: (p.variants as string[]).length > 0 ? variant : null,
      unit_price_cents: effectivePrice(p),
      quantity: i.qty as number,
    });
  }

  const subtotal = orderItems.reduce((s, o) => s + o.unit_price_cents * o.quantity, 0);
  const shipping = store.shipping_cents as number;
  const total = subtotal + shipping;
  const rate = await getCommissionRate();
  const commission = computeCommissionCents(subtotal, rate);

  // 5) Registra o pedido como PENDENTE (só vira "pago" quando o Mercado Pago confirmar)
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: user.id,
      store_id: storeId,
      status: "pending",
      subtotal_cents: subtotal,
      shipping_cents: shipping,
      total_cents: total,
      commission_rate: rate,
      commission_cents: commission,
      shipping_address: address,
    })
    .select("id")
    .single();
  if (orderError || !order) return fail("Não foi possível criar o pedido.", 500);

  await admin.from("order_items").insert(orderItems.map((o) => ({ ...o, order_id: order.id })));

  // 6) Cria a cobrança no Mercado Pago com a conta do vendedor e a comissão da plataforma
  const mpItems = orderItems.map((o) => ({
    id: o.product_id,
    title: o.variant ? `${o.name} (${o.variant})` : o.name,
    quantity: o.quantity,
    unit_price: o.unit_price_cents / 100,
    currency_id: "BRL",
  }));
  if (shipping > 0) {
    mpItems.push({ id: "frete", title: "Frete", quantity: 1, unit_price: shipping / 100, currency_id: "BRL" });
  }

  const preference: Record<string, unknown> = {
    items: mpItems,
    marketplace_fee: commission / 100,
    external_reference: order.id,
    notification_url: `${SITE_URL}/api/webhooks/mercadopago?order=${order.id}`,
    back_urls: {
      success: `${SITE_URL}/pedidos/${order.id}`,
      pending: `${SITE_URL}/pedidos/${order.id}`,
      failure: `${SITE_URL}/carrinho`,
    },
    statement_descriptor: "MINHAVITRINE",
    payment_methods: {
      excluded_payment_types: (EXCLUDED_BY_METHOD[body.method ?? "all"] ?? []).map((id) => ({ id })),
      installments: 12,
    },
  };
  if (SITE_URL.startsWith("https://")) preference.auto_return = "approved";

  let initPoint: string | undefined;
  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(preference),
    });
    if (res.ok) {
      const json = (await res.json()) as { init_point?: string };
      initPoint = json.init_point;
    }
  } catch {
    // tratado abaixo
  }

  if (!initPoint) {
    await admin.from("orders").update({ status: "cancelled", notes: "Falha ao criar cobrança no Mercado Pago" }).eq("id", order.id);
    return fail("O pagamento não pôde ser iniciado agora. A loja pode precisar reconectar o Mercado Pago.", 502);
  }

  return NextResponse.json({ url: initPoint });
}
