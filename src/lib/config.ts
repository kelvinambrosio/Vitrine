export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "contato@minhavitrine.com.br";
export const DEFAULT_COMMISSION_RATE = Number(process.env.COMMISSION_RATE ?? "0.05");

export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
