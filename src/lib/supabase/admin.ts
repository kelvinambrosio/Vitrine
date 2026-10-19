import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave de serviço: IGNORA as regras de segurança (RLS).
 * Use somente no servidor, e só depois de verificar quem é o usuário e o que ele pode fazer.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Variáveis do Supabase não configuradas (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
