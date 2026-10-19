import Link from "next/link";
import Flash from "@/components/Flash";
import { requestPasswordReset } from "../entrar/actions";

export const metadata = { title: "Esqueci minha senha" };

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Esqueci minha senha</h1>
      <Flash erro={erro} ok={ok} />
      <form action={requestPasswordReset} className="space-y-3 rounded-2xl bg-white p-6">
        <label className="block text-sm">E-mail da conta
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark">Enviar link</button>
        <Link href="/entrar" className="block text-center text-sm text-brand hover:underline">Voltar</Link>
      </form>
    </div>
  );
}
