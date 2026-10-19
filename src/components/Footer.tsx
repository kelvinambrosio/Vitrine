import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-brand">
            Minha<span className="text-accent">Vitrine</span>
          </p>
          <p className="mt-2">O shopping virtual onde qualquer pessoa pode abrir a sua loja.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/vender" className="hover:text-brand">Abrir minha loja grátis</Link>
          <Link href="/ajuda" className="hover:text-brand">Central de ajuda</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-brand">{SUPPORT_EMAIL}</a>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/termos" className="hover:text-brand">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-brand">Política de privacidade</Link>
        </div>
      </div>
      <p className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Minha Vitrine. Todos os direitos reservados.
      </p>
    </footer>
  );
}
