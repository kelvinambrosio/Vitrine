import Link from "next/link";
import Flash from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { deleteAccount } from "./actions";

export const metadata = { title: "Minha conta" };

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const { supabase, user } = await requireUser("/conta");
  const { data: profile } = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Minha conta</h1>
      <Flash erro={erro} ok={ok} />

      <section className="rounded-2xl bg-white p-6 text-sm">
        <p><strong>Nome:</strong> {profile?.full_name || "-"}</p>
        <p><strong>E-mail:</strong> {user.email}</p>
        <Link href="/esqueci-senha" className="mt-3 inline-block text-brand hover:underline">Trocar senha</Link>
      </section>

      <section className="rounded-2xl bg-white p-6 text-sm">
        <h2 className="mb-1 font-bold">Seus dados (LGPD)</h2>
        <p className="text-slate-600">Você pode baixar uma cópia de todos os dados que temos sobre você.</p>
        <a href="/api/conta/exportar" className="mt-3 inline-block rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
          Baixar meus dados
        </a>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm">
        <h2 className="mb-1 font-bold text-red-700">Excluir minha conta</h2>
        <p className="text-slate-600">
          Sem pedidos, tudo é apagado. Se você já comprou, mantemos apenas os dados do pedido que a lei exige guardar, e
          seu perfil é anonimizado. Lojas precisam falar com o suporte.
        </p>
        <form action={deleteAccount} className="mt-3 flex flex-wrap gap-2">
          <input name="confirm" placeholder="Digite EXCLUIR" className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">Excluir conta</button>
        </form>
      </section>
    </div>
  );
}
