import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { ROUTES } from "@/lib/constants";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LogoutButton } from "@/components/layout/LogoutButton";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="flex flex-col gap-1 text-sm">
            <Link
              href={ROUTES.account.analisi}
              className="py-2 text-accent hover:text-accent/80"
            >
              Analizza
            </Link>
            <Link href={ROUTES.account.home} className="py-2 text-paper-300 hover:text-paper-50">
              Home
            </Link>
            <Link
              href={ROUTES.account.subscription}
              className="py-2 text-paper-300 hover:text-paper-50"
            >
              Abbonamento
            </Link>
            <Link href={ROUTES.account.profile} className="py-2 text-paper-300 hover:text-paper-50">
              Profilo
            </Link>
            <Link href={ROUTES.account.saved} className="py-2 text-paper-300 hover:text-paper-50">
              Salvati
            </Link>
            <Link href={ROUTES.account.history} className="py-2 text-paper-300 hover:text-paper-50">
              Cronologia
            </Link>
            <div className="mt-6 border-t border-paper-300/10 pt-4">
              <LogoutButton className="text-left text-sm text-paper-400 hover:text-paper-50" />
            </div>
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
