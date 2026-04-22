import Link from "next/link";
import { ROUTES, APP_NAME } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "./LogoutButton";

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <header className="border-b border-paper-300/10 bg-ink-900/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.catalog} className="font-display text-xl tracking-wide">
          {APP_NAME}
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href={ROUTES.lecture} className="text-paper-300 hover:text-paper-50">
            Lecture
          </Link>
          <Link href={ROUTES.corsi} className="text-paper-300 hover:text-paper-50">
            Corsi
          </Link>
          <Link href={ROUTES.documentari} className="text-paper-300 hover:text-paper-50">
            Documentari
          </Link>
          <Link href={ROUTES.authors} className="text-paper-300 hover:text-paper-50">
            Autori
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.search}
            className="text-sm text-paper-300 hover:text-paper-50"
          >
            Cerca
          </Link>
          {user ? (
            <>
              <Link
                href={ROUTES.account.home}
                className="text-sm text-paper-50 hover:text-accent"
              >
                Io
              </Link>
              <LogoutButton className="text-sm text-paper-400 hover:text-paper-50" />
            </>
          ) : (
            <Link
              href={ROUTES.login}
              className="text-sm text-paper-50 hover:text-accent"
            >
              Accedi
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
