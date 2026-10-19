import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = ["", "/vender", "/ajuda", "/termos", "/privacidade", "/busca"].map((p) => ({
    url: `${SITE_URL}${p}`,
  }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return base;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: stores }, { data: products }] = await Promise.all([
    supabase.from("stores").select("slug").eq("status", "active").limit(2000),
    supabase.from("products").select("id").eq("active", true).limit(5000),
  ]);

  return [
    ...base,
    ...(stores ?? []).map((s) => ({ url: `${SITE_URL}/loja/${s.slug}` })),
    ...(products ?? []).map((p) => ({ url: `${SITE_URL}/produto/${p.id}` })),
  ];
}
