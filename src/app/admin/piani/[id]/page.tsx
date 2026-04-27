import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { getApi } from "@/server/trpc/server";
import { PlanForm } from "../PlanForm";
import { PlanContentsPicker } from "./PlanContentsPicker";

export const metadata: Metadata = { title: "Modifica piano", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPlanEditPage({
  params,
}: {
  params: { id: string };
}) {
  const api = await getApi();
  let plan;
  try {
    plan = await api.plan.get({ id: params.id });
  } catch {
    notFound();
  }
  if (!plan) notFound();

  return (
    <section>
      <Link
        href={ROUTES.admin.plans}
        className="text-sm text-paper-300 hover:text-paper-50"
      >
        ← Piani
      </Link>
      <h1 className="mt-4 font-display text-3xl">{plan.name}</h1>
      <p className="mt-2 text-xs text-paper-400">
        {plan.stripeProductId ? `Stripe Product: ${plan.stripeProductId}` : "Stripe non sincronizzato"}
        {plan.stripePriceId ? ` · Price: ${plan.stripePriceId}` : null}
      </p>
      <div className="mt-8">
        <PlanForm
          initial={{
            id: plan.id,
            slug: plan.slug,
            name: plan.name,
            description: plan.description ?? "",
            featureBulletsText: plan.featureBullets.join("\n"),
            priceEuros: (plan.priceCents / 100).toFixed(2),
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            sortOrder: plan.sortOrder,
            isActive: plan.isActive,
          }}
        />
      </div>

      <div className="mt-16 border-t border-paper-300/10 pt-10">
        <h2 className="font-display text-2xl">Contenuti inclusi</h2>
        <p className="mt-2 max-w-2xl text-sm text-paper-300">
          Qui scegli quali contenuti del catalogo on-demand sono inclusi in
          questo piano. I nuovi contenuti che crei vengono aggiunti
          automaticamente a tutti i piani attivi: puoi rimuoverli qui sotto se
          non li vuoi in questo specifico piano.
        </p>
        <div className="mt-6">
          <PlanContentsPicker planId={plan.id} />
        </div>
      </div>
    </section>
  );
}
