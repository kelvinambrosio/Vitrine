import Link from "next/link";
import Flash from "@/components/Flash";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserBan } from "../actions";

export const metadata = { title: "Administração: usuários" };

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: list }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
    admin.from("profiles").select("id,full_name,role"),
  ]);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-brand hover:underline">← Painel administrativo</Link>
      <h1 className="text-2xl font-bold">Usuários</h1>
      <Flash erro={erro} ok={ok} />
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 text-slate-500">
            <tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Papel</th><th className="p-3">Desde</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {list?.users.map((u) => {
              const p = byId.get(u.id);
              const banned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
              return (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="p-3">{p?.full_name || "-"}</td>
                  <td className="p-3">{u.email}{!u.email_confirmed_at && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">não confirmado</span>}</td>
                  <td className="p-3">{p?.role ?? "buyer"}{banned && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">bloqueado</span>}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3">
                    {p?.role !== "admin" && (
                      <form action={setUserBan}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="ban" value={banned ? "0" : "1"} />
                        <button className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100">{banned ? "Liberar" : "Bloquear"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Mostrando até 200 usuários.</p>
    </div>
  );
}
