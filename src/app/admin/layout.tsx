import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROUTES } from "@/lib/constants";
import { LogoutButton } from "@/components/layout/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-paper-300/10 bg-ink-800 px-4 py-8 md:block">
        <p className="px-2 font-display text-lg">Admin</p>
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <Link href={ROUTES.admin.home} className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5">
            Dashboard
          </Link>
          <Link
            href={ROUTES.admin.content}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Contenuti
          </Link>
          <Link
            href={ROUTES.admin.authors}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Autori
          </Link>
          <Link
            href={ROUTES.admin.users}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Utenti
          </Link>
          <Link
            href={ROUTES.admin.coupons}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Coupon
          </Link>
          <Link
            href={ROUTES.admin.plans}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Piani
          </Link>
          <Link
            href={ROUTES.admin.settings}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Impostazioni
          </Link>
          <Link
            href={ROUTES.admin.email}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Email
          </Link>
          <Link
            href={ROUTES.admin.leadMagnet}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Lead magnet
          </Link>
          <Link
            href={ROUTES.admin.audit}
            className="rounded-sm px-2 py-2 text-paper-300 hover:bg-paper-50/5"
          >
            Audit log
          </Link>
          <div className="mt-4 border-t border-paper-300/10 px-2 pt-4">
            <LogoutButton />
          </div>
        </nav>
      </aside>
      <main className="flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
