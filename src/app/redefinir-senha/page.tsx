import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { updatePassword } from "../entrar/actions";

export const metadata = { title: "Nova senha" };

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  await requireUser("/redefinir-senha");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Criar nova senha</h1>
      <Flash erro={erro} />
      <form action={updatePassword} className="space-y-3 rounded-2xl bg-white p-6">
        <label className="block text-sm">Nova senha (mínimo 8 caracteres)
          <input name="password" type="password" minLength={8} required autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark">Salvar nova senha</button>
      </form>
    </div>
  );
}
