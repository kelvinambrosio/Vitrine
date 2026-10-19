import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/entrar/actions";
import CartLink from "@/components/CartLink";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: categories } = await supabase.from("categories").select("slug,name").order("name");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-brand">
          Minha<span className="text-accent">Vitrine</span>
        </Link>

        <form action="/busca" className="order-3 flex w-full flex-1 md:order-none md:w-auto">
          <input
            name="q"
            type="search"
            placeholder="Buscar produtos, marcas e lojas"
            className="w-full rounded-l-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand"
          />
          <button className="rounded-r-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">
            Buscar
          </button>
        </form>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/vender" className="hidden rounded-lg px-3 py-2 font-medium text-brand hover:bg-brand-soft sm:block">
            Venda grátis
          </Link>
          {user ? (
            <>
              <Link href="/pedidos" className="rounded-lg px-3 py-2 font-medium hover:bg-slate-100">
                Meus pedidos
              </Link>
              <Link href="/painel" className="rounded-lg px-3 py-2 font-medium hover:bg-slate-100">
                Minha loja
              </Link>
              <Link href="/conta" className="hidden rounded-lg px-3 py-2 font-medium hover:bg-slate-100 sm:block">
                Conta
              </Link>
              <form action={logout}>
                <button className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="rounded-lg px-3 py-2 font-medium hover:bg-slate-100">
              Entrar
            </Link>
          )}
          <CartLink />
        </nav>
      </div>

      {categories && categories.length > 0 && (
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-4 py-2 text-sm text-slate-600">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/busca?categoria=${c.slug}`}
                className="whitespace-nowrap hover:text-brand"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
