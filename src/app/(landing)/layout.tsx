import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";

/**
 * Minimal layout for public lead-magnet landings.
 *
 * No Header, no Footer: these pages are pure acquisition pages for
 * external traffic (paid, socials, etc.) and shouldn't offer distractions
 * away from the single CTA. Just a small masthead with the logo + a
 * subtle login link for people who already have an account.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-paper-300/10">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href={ROUTES.home}
            className="font-display text-lg tracking-wide"
          >
            {APP_NAME}
          </Link>
          <Link
            href={ROUTES.login}
            className="text-xs text-paper-400 hover:text-paper-50"
          >
            Ho già un account
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
