import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente do Supabase para Server Components, Server Actions e rotas de API (usa o login do usuário). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: o middleware cuida de renovar a sessão.
          }
        },
      },
    }
  );
}
