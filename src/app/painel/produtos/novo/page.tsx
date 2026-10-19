import Link from "next/link";
import { redirect } from "next/navigation";
import Flash from "@/components/Flash";
import ImageInput from "@/components/ImageInput";
import { getMyStore, requireUser } from "@/lib/auth";
import { createProduct } from "../../actions";

export const metadata = { title: "Novo produto" };

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const { supabase, user } = await requireUser("/painel/produtos/novo");
  const store = await getMyStore(supabase, user.id);
  if (!store) redirect("/painel");
  const { data: categories } = await supabase.from("categories").select("id,name").order("name");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/painel" className="text-sm text-brand hover:underline">← Voltar ao painel</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Novo produto</h1>
      <Flash erro={erro} ok={ok} />
      <form action={createProduct} className="space-y-4 rounded-2xl bg-white p-6">
        <label className="block text-sm">Nome do produto
          <input name="name" required maxLength={120} className={input} />
        </label>
        <label className="block text-sm">Descrição
          <textarea name="description" rows={5} maxLength={4000} className={input} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">Preço (R$)
            <input name="price" required inputMode="decimal" placeholder="49,90" className={input} />
          </label>
          <label className="block text-sm">Preço promocional (opcional)
            <input name="promo" inputMode="decimal" placeholder="39,90" className={input} />
          </label>
          <label className="block text-sm">Estoque
            <input name="stock" type="number" min={0} defaultValue={1} required className={input} />
          </label>
        </div>
        <label className="block text-sm">Categoria
          <select name="category_id" className={input} defaultValue="">
            <option value="">Escolha…</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">Variações (opcional, separadas por vírgula)
          <input name="variants" placeholder="P, M, G  ou  Azul, Vermelho" className={input} />
        </label>
        <div className="text-sm">
          <p className="mb-1">Fotos (até 5; são reduzidas automaticamente)</p>
          <ImageInput name="photos" multiple max={5} />
        </div>
        <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
          Publicar produto
        </button>
      </form>
    </div>
  );
}
