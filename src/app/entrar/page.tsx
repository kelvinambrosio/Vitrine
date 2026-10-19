import Link from "next/link";
import Flash from "@/components/Flash";
import { login, signup } from "./actions";

export const metadata = { title: "Entrar ou criar conta" };

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string; next?: string }>;
}) {
  const { erro, ok, next } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl">
      <Flash erro={erro} ok={ok} />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold">Já tenho conta</h1>
          <form action={login} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="block text-sm">
              E-mail
              <input name="email" type="email" required autoComplete="email" className={input} />
            </label>
            <label className="block text-sm">
              Senha
              <input name="password" type="password" required autoComplete="current-password" className={input} />
            </label>
            <button className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark">
              Entrar
            </button>
            <Link href="/esqueci-senha" className="block text-center text-sm text-brand hover:underline">
              Esqueci minha senha
            </Link>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold">Criar conta grátis</h2>
          <p className="mt-1 text-sm text-slate-500">Serve para comprar e também para abrir sua loja.</p>
          <form action={signup} className="mt-4 space-y-3">
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="block text-sm">
              Nome completo
              <input name="name" required autoComplete="name" className={input} />
            </label>
            <label className="block text-sm">
              E-mail
              <input name="email" type="email" required autoComplete="email" className={input} />
            </label>
            <label className="block text-sm">
              Senha (mínimo 8 caracteres)
              <input name="password" type="password" minLength={8} required autoComplete="new-password" className={input} />
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input type="checkbox" name="terms" className="mt-0.5" required />
              <span>
                Li e aceito os <Link href="/termos" className="underline">Termos de uso</Link> e a{" "}
                <Link href="/privacidade" className="underline">Política de privacidade</Link>.
              </span>
            </label>
            <button className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white hover:opacity-90">
              Criar conta
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
