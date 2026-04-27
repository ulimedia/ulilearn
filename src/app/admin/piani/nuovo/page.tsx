import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { PlanForm } from "../PlanForm";

export const metadata: Metadata = { title: "Nuovo piano", robots: { index: false } };

export default function AdminPlanNewPage() {
  return (
    <section>
      <Link
        href={ROUTES.admin.plans}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Piani
      </Link>
      <h1 className="mt-4 font-display text-3xl">Nuovo piano</h1>
      <p className="mt-2 max-w-2xl text-sm text-paper-300">
        Compila i campi e salva: creiamo Product + Price su Stripe e tracciamo
        gli ID nel DB.
      </p>
      <div className="mt-8">
        <PlanForm />
      </div>
    </section>
  );
}
