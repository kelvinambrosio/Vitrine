"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";
import { SITE_URL } from "@/lib/config";

function back(kind: "erro" | "ok", msg: string, next?: string): never {
  const extra = next ? `&next=${encodeURIComponent(next)}` : "";
  redirect(`/entrar?${kind}=${encodeURIComponent(msg)}${extra}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""), "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back("erro", "E-mail ou senha incorretos, ou e-mail ainda não confirmado.", next);
  redirect(next);
}

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accepted = formData.get("terms") === "on";
  const next = safeNext(String(formData.get("next") ?? ""), "/");

  if (!name || !email) back("erro", "Preencha nome e e-mail.", next);
  if (password.length < 8) back("erro", "A senha precisa ter pelo menos 8 caracteres.", next);
  if (!accepted) back("erro", "Aceite os Termos de uso e a Política de privacidade para continuar.", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: `${SITE_URL}/auth/callback` },
  });
  if (error) back("erro", "Não foi possível criar a conta. Verifique os dados ou tente entrar.", next);

  if (data.session) redirect(next);
  back("ok", "Conta criada! Confira seu e-mail e clique no link de confirmação para entrar.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/redefinir-senha` });
  }
  // Resposta igual exista ou não a conta, para não revelar quem é cadastrado.
  redirect(`/esqueci-senha?ok=${encodeURIComponent("Se esse e-mail estiver cadastrado, enviamos um link para criar uma nova senha.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?erro=${encodeURIComponent("O link expirou. Peça um novo.")}`);
  if (password.length < 8) redirect(`/redefinir-senha?erro=${encodeURIComponent("A senha precisa ter pelo menos 8 caracteres.")}`);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/redefinir-senha?erro=${encodeURIComponent("Não foi possível alterar a senha. Tente de novo.")}`);
  redirect(`/painel?ok=${encodeURIComponent("Senha alterada com sucesso.")}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
