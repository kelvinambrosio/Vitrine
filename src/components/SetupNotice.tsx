export default function SetupNotice() {
  return (
    <div className="mx-auto my-16 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
      <h1 className="text-xl font-bold">Falta conectar o banco de dados</h1>
      <p className="mt-3 text-sm leading-relaxed">
        O site está no ar, mas ainda não encontrou as chaves do Supabase. Copie o arquivo <code>.env.example</code> para{" "}
        <code>.env.local</code> (ou cadastre as variáveis na Vercel) e preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. O passo a passo está no arquivo <code>GUIA.md</code>.
      </p>
    </div>
  );
}
