import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto my-20 max-w-md text-center">
      <p className="text-5xl">🔎</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço pode estar errado, ou o produto ou a loja saiu do ar.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
        Voltar para a página inicial
      </Link>
    </div>
  );
}
