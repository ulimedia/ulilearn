import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { Footer } from "@/components/layout/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-paper-300/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.home} className="font-display text-xl">
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={ROUTES.login} className="text-paper-300 hover:text-paper-50">
              Accedi
            </Link>
            <Link
              href={ROUTES.subscribe}
              className="bg-accent px-4 py-2 text-accent-foreground hover:bg-accent/90"
            >
              Abbonati
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
