"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

type PlanFormValues = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  featureBulletsText: string; // textarea, one bullet per line
  priceEuros: string; // input as euros, converted to cents on submit
  currency: string;
  billingInterval: "year" | "month";
  sortOrder: number;
  isActive: boolean;
  subscriberDiscountPercent: number;
};

export function PlanForm({ initial }: { initial?: PlanFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<PlanFormValues>(
    initial ?? {
      slug: "",
      name: "",
      description: "",
      featureBulletsText: "",
      priceEuros: "0",
      currency: "EUR",
      billingInterval: "year",
      sortOrder: 0,
      isActive: true,
      subscriberDiscountPercent: 20,
    },
  );

  const upsert = trpc.plan.upsert.useMutation({
    onSuccess: ({ plan, syncWarning }) => {
      if (syncWarning) toast.error(`Salvato in DB, ma: ${syncWarning}`);
      else toast.success("Piano salvato e sincronizzato con Stripe");
      router.push(ROUTES.admin.planEdit(plan.id));
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(values.priceEuros || "0") * 100);
    if (Number.isNaN(priceCents) || priceCents < 0) {
      toast.error("Prezzo non valido");
      return;
    }
    const featureBullets = values.featureBulletsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    upsert.mutate({
      id: values.id,
      slug: values.slug.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      featureBullets,
      priceCents,
      currency: values.currency,
      billingInterval: values.billingInterval,
      sortOrder: Number.isFinite(values.sortOrder) ? values.sortOrder : 0,
      isActive: values.isActive,
      subscriberDiscountPercent: values.subscriberDiscountPercent,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="Ulilearn Plus annuale"
          />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            required
            pattern="^[a-z0-9-]+$"
            value={values.slug}
            onChange={(e) =>
              setValues((v) => ({ ...v, slug: e.target.value.toLowerCase() }))
            }
            placeholder="plus-annuale"
          />
          <p className="mt-1 text-xs text-paper-400">
            Identificatore tecnico, solo lettere minuscole, numeri e trattini.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descrizione (opzionale)</Label>
        <Textarea
          id="description"
          rows={3}
          maxLength={2000}
          value={values.description}
          onChange={(e) =>
            setValues((v) => ({ ...v, description: e.target.value }))
          }
          placeholder="Tutto Ulilearn per un anno intero, senza pensieri."
        />
      </div>

      <div>
        <Label htmlFor="bullets">Vantaggi (uno per riga)</Label>
        <Textarea
          id="bullets"
          rows={5}
          value={values.featureBulletsText}
          onChange={(e) =>
            setValues((v) => ({ ...v, featureBulletsText: e.target.value }))
          }
          placeholder={"Accesso completo al catalogo\nNuovi contenuti durante l'anno inclusi\nDisdici quando vuoi"}
        />
        <p className="mt-1 text-xs text-paper-400">
          Mostrati come elenco puntato sulla pagina /abbonati. Max 20.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="price">Prezzo (€)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            required
            value={values.priceEuros}
            onChange={(e) =>
              setValues((v) => ({ ...v, priceEuros: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="currency">Valuta</Label>
          <Select
            id="currency"
            value={values.currency}
            onChange={(e) =>
              setValues((v) => ({ ...v, currency: e.target.value }))
            }
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="interval">Intervallo</Label>
          <Select
            id="interval"
            value={values.billingInterval}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                billingInterval: e.target.value as "year" | "month",
              }))
            }
          >
            <option value="year">Annuale</option>
            <option value="month">Mensile</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="discount">Sconto Plus su contenuti a pagamento (%)</Label>
          <Input
            id="discount"
            type="number"
            min={0}
            max={100}
            value={values.subscriberDiscountPercent}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                subscriberDiscountPercent: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
          <p className="mt-1 text-xs text-paper-400">
            Applicato di default a masterclass/workshop acquistabili.
          </p>
        </div>
        <div>
          <Label htmlFor="sort">Ordine in pagina</Label>
          <Input
            id="sort"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                sortOrder: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
        </div>
      </div>

      <Switch
        checked={values.isActive}
        onChange={(next) => setValues((v) => ({ ...v, isActive: next }))}
        label="Piano attivo"
        description="Se disattivo non viene mostrato in /abbonati e Stripe lo archivia."
      />

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Salvo…" : values.id ? "Salva modifiche" : "Crea piano"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(ROUTES.admin.plans)}
        >
          Annulla
        </Button>
      </div>
    </form>
  );
}
