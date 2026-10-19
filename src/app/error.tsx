"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto my-20 max-w-md text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-4 text-2xl font-bold">Algo deu errado</h1>
      <p className="mt-2 text-slate-600">Já registramos o problema. Tente novamente em instantes.</p>
      <button onClick={reset} className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
        Tentar de novo
      </button>
    </div>
  );
}
