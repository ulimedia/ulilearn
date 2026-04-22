import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { env } from "@/lib/env";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-paper-300/10 bg-ink-900">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-paper-300 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="font-display text-lg text-paper-50">{APP_NAME}</p>
            <p className="mt-1">Formazione avanzata in fotografia contemporanea.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={`${env.NEXT_PUBLIC_SITE_URL}/chi-siamo`}>Chi siamo</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/termini">Termini</Link>
            <a href="mailto:hello@ulilearn.academy">Contatti</a>
          </nav>
        </div>
        <p className="mt-8 text-xs">© {new Date().getFullYear()} Ulilearn — Ulimedia</p>
      </div>
    </footer>
  );
}
