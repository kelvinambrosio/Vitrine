import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SetupNotice from "@/components/SetupNotice";
import { hasSupabaseEnv, SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Minha Vitrine: seu shopping virtual", template: "%s | Minha Vitrine" },
  description: "Abra sua loja grátis e venda para todo o Brasil, ou encontre produtos de vários vendedores em um só lugar.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ready = hasSupabaseEnv();
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col">
        {ready ? <Header /> : null}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{ready ? children : <SetupNotice />}</main>
        {ready ? <Footer /> : null}
      </body>
    </html>
  );
}
