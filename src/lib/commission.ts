import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_COMMISSION_RATE } from "@/lib/config";

/** Lê a comissão vigente (configurável em /admin). Padrão: 5%. */
export async function getCommissionRate(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("platform_settings").select("value").eq("key", "commission_rate").maybeSingle();
    const n = Number(data?.value);
    if (Number.isFinite(n) && n >= 0 && n <= 0.5) return n;
  } catch {
    // usa o padrão
  }
  return DEFAULT_COMMISSION_RATE;
}

/** Comissão sobre o valor dos PRODUTOS (o frete não entra). Arredonda para centavos. */
export function computeCommissionCents(productsSubtotalCents: number, rate: number): number {
  return Math.round(productsSubtotalCents * rate);
}
