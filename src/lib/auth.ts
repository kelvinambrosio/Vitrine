import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Só aceita caminhos internos do site (evita redirecionar para sites externos). */
export function safeNext(next: string | undefined | null, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/entrar?erro=${encodeURIComponent("Entre para continuar.")}&next=${encodeURIComponent(next)}`);
  }
  return { supabase, user };
}

export async function getMyStore(supabase: SupabaseServerClient, userId: string) {
  const { data } = await supabase.from("stores").select("*").eq("owner_id", userId).maybeSingle();
  return data;
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser("/admin");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user };
}
