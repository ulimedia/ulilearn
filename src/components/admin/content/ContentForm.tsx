"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CoverUploader } from "./CoverUploader";
import { MarkdownField } from "./MarkdownField";
import { AuthorCombobox } from "./AuthorCombobox";
import { TagInput } from "./TagInput";
import {
  CONTENT_TYPES,
  CONTENT_FORMATS,
  CONTENT_TYPE_LABELS,
  CONTENT_FORMAT_LABELS,
  PURCHASABLE_TYPES,
  ROUTES,
} from "@/lib/constants";
import { toSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { ContentType, ContentFormat, ContentStatus } from "@prisma/client";

export type ContentFormInitial = {
  id?: string;
  title?: string;
  subtitle?: string | null;
  slug?: string;
  type?: ContentType;
  format?: ContentFormat;
  descriptionMd?: string | null;
  coverImageUrl?: string | null;
  authorId?: string | null;
  vimeoVideoId?: string | null;
  durationSeconds?: number;
  tags?: string[];
  isFeatured?: boolean;
  isFree?: boolean;
  liveStartAt?: Date | string | null;
  liveEndAt?: Date | string | null;
  registrationDeadlineAt?: Date | string | null;
  timezone?: string | null;
  location?: string | null;
  isPurchasable?: boolean;
  standalonePriceCents?: number | null;
  subscriberPriceCentsOverride?: number | null;
  maxSeats?: number | null;
  status?: ContentStatus;
  scheduledPublishAt?: Date | string | null;
};

type Tab = "general" | "media" | "pricing" | "event" | "publish";

function toDatetimeLocal(v: Date | string | null | undefined): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function ContentForm({ initial }: { initial?: ContentFormInitial }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [type, setType] = useState<ContentType>(initial?.type ?? "lecture");
  const [format, setFormat] = useState<ContentFormat>(
    initial?.format ?? "on_demand",
  );
  const [descriptionMd, setDescriptionMd] = useState<string>(
    initial?.descriptionMd ?? "",
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initial?.coverImageUrl ?? null,
  );
  const [authorId, setAuthorId] = useState<string | null>(initial?.authorId ?? null);
  const [vimeoVideoId, setVimeoVideoId] = useState(initial?.vimeoVideoId ?? "");
  const [durationSeconds, setDurationSeconds] = useState(
    initial?.durationSeconds ?? 0,
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [isFree, setIsFree] = useState(initial?.isFree ?? false);

  const [liveStartAt, setLiveStartAt] = useState(toDatetimeLocal(initial?.liveStartAt));
  const [liveEndAt, setLiveEndAt] = useState(toDatetimeLocal(initial?.liveEndAt));
  const [registrationDeadlineAt, setRegistrationDeadlineAt] = useState(
    toDatetimeLocal(initial?.registrationDeadlineAt),
  );
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Europe/Rome");
  const [location, setLocation] = useState(initial?.location ?? "");

  const [isPurchasable, setIsPurchasable] = useState(
    initial?.isPurchasable ?? PURCHASABLE_TYPES.includes(type as never),
  );
  const [standalonePriceCents, setStandalonePriceCents] = useState<number | null>(
    initial?.standalonePriceCents ?? null,
  );
  const [subscriberPriceCentsOverride, setSubscriberPriceCentsOverride] = useState<
    number | null
  >(initial?.subscriberPriceCentsOverride ?? null);
  const [maxSeats, setMaxSeats] = useState<number | null>(initial?.maxSeats ?? null);

  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? "draft");
  const [scheduledPublishAt, setScheduledPublishAt] = useState(
    toDatetimeLocal(initial?.scheduledPublishAt),
  );

  // Auto-apply purchasable flag when user changes type (unless they've already toggled it)
  function handleTypeChange(next: ContentType) {
    setType(next);
    const shouldBePurchasable = PURCHASABLE_TYPES.includes(next as never);
    if (shouldBePurchasable && !isPurchasable) setIsPurchasable(true);
    if (!shouldBePurchasable && isPurchasable && !initial?.isPurchasable) {
      setIsPurchasable(false);
    }
  }

  function handleTitleChange(next: string) {
    setTitle(next);
    if (!slugTouched) setSlug(toSlug(next));
  }

  const upsert = trpc.content.upsert.useMutation();

  async function handleSubmit(e: FormEvent, publish = false) {
    e.preventDefault();
    setSaving(true);
    try {
      const finalStatus = publish ? "published" : status;
      const payload = {
        id: initial?.id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        slug: slug.trim() || undefined,
        type,
        format,
        descriptionMd: descriptionMd || null,
        coverImageUrl,
        authorId,
        vimeoVideoId: vimeoVideoId.trim() || null,
        durationSeconds: Number(durationSeconds) || 0,
        tags,
        isFeatured,
        isFree,
        liveStartAt: fromDatetimeLocal(liveStartAt),
        liveEndAt: fromDatetimeLocal(liveEndAt),
        registrationDeadlineAt: fromDatetimeLocal(registrationDeadlineAt),
        timezone,
        location: location.trim() || null,
        isPurchasable,
        standalonePriceCents: isPurchasable ? standalonePriceCents : null,
        subscriberPriceCentsOverride,
        maxSeats,
        status: finalStatus,
        scheduledPublishAt: fromDatetimeLocal(scheduledPublishAt),
      };
      const res = await upsert.mutateAsync(payload);
      toast.success(publish ? "Pubblicato" : "Salvato");
      if (!initial?.id) {
        router.push(ROUTES.admin.contentEdit(res.id));
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore di salvataggio");
    } finally {
      setSaving(false);
    }
  }

  const showPricing = isPurchasable || PURCHASABLE_TYPES.includes(type as never);
  const showEventFields = format !== "on_demand";

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 border-b border-paper-300/10">
        <Tabs tab={tab} setTab={setTab} />
        <div className="ml-auto flex items-center gap-2 pb-3">
          <Button type="submit" variant="secondary" size="sm" disabled={saving}>
            {saving ? "Salvo…" : "Salva"}
          </Button>
          {status !== "published" && (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
            >
              Salva e pubblica
            </Button>
          )}
        </div>
      </div>

      {tab === "general" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Field label="Titolo" required>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} required />
            </Field>
            <Field label="Sottotitolo">
              <Input value={subtitle ?? ""} onChange={(e) => setSubtitle(e.target.value)} />
            </Field>
            <Field label="Slug" hint="URL-friendly, generato da titolo">
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
              />
            </Field>
            <Field label="Descrizione">
              <MarkdownField value={descriptionMd} onChange={setDescriptionMd} />
            </Field>
            <Field label="Tag">
              <TagInput value={tags} onChange={setTags} />
            </Field>
          </div>
          <div className="space-y-5">
            <Field label="Tipo" required>
              <Select
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as ContentType)}
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Formato" required>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as ContentFormat)}
              >
                {CONTENT_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {CONTENT_FORMAT_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Autore">
              <AuthorCombobox value={authorId} onChange={setAuthorId} />
            </Field>
            <Switch
              checked={isFeatured}
              onChange={setIsFeatured}
              label="In evidenza"
              description="Mostrato nell'hero del catalogo."
            />
            <Switch
              checked={isFree}
              onChange={setIsFree}
              label="Contenuto gratuito"
              description="Accessibile senza abbonamento/acquisto."
            />
          </div>
        </div>
      )}

      {tab === "media" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Field label="Copertina">
            <CoverUploader
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              bucket="covers"
              entityId={initial?.id}
            />
          </Field>
          <div className="space-y-5">
            <Field
              label="Vimeo video ID"
              hint="ID numerico del video principale (per corsi resta opzionale — le lezioni hanno il loro)."
            >
              <Input
                value={vimeoVideoId ?? ""}
                onChange={(e) => setVimeoVideoId(e.target.value)}
                placeholder="123456789"
                inputMode="numeric"
              />
            </Field>
            <Field label="Durata (secondi)">
              <Input
                type="number"
                min={0}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value) || 0)}
              />
            </Field>
            {type === "corso" && initial?.id && (
              <div className="border border-paper-300/15 p-5">
                <p className="font-display text-lg">Moduli e lezioni</p>
                <p className="mt-1 text-sm text-paper-400">
                  Gestisci la struttura del corso e associa i video Vimeo alle
                  singole lezioni.
                </p>
                <Link
                  href={ROUTES.admin.contentModules(initial.id)}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4")}
                >
                  Apri editor moduli →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="space-y-6">
          <Switch
            checked={isPurchasable}
            onChange={setIsPurchasable}
            label="Acquistabile singolarmente"
            description="Tipico per masterclass e workshop. Gli abbonati Plus avranno lo sconto fisso configurato in /admin/piani."
          />
          {showPricing && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Prezzo standard (€)" required hint="Inserito in euro, salvato in centesimi.">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={standalonePriceCents != null ? (standalonePriceCents / 100).toString() : ""}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setStandalonePriceCents(isNaN(v) ? null : Math.round(v * 100));
                  }}
                />
              </Field>
              <Field
                label="Prezzo abbonato override (€)"
                hint="Lascia vuoto per applicare lo sconto globale. Sovrascrive tutto se valorizzato."
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={
                    subscriberPriceCentsOverride != null
                      ? (subscriberPriceCentsOverride / 100).toString()
                      : ""
                  }
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSubscriberPriceCentsOverride(
                      isNaN(v) ? null : Math.round(v * 100),
                    );
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {tab === "event" && (
        <div className="space-y-6">
          {!showEventFields && (
            <p className="text-sm text-paper-400">
              Imposta il formato a &ldquo;Live online/ibrido/presenza&rdquo; per abilitare i
              campi dell&apos;evento.
            </p>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Inizio live" required={showEventFields}>
              <Input
                type="datetime-local"
                value={liveStartAt}
                onChange={(e) => setLiveStartAt(e.target.value)}
                disabled={!showEventFields}
              />
            </Field>
            <Field label="Fine live">
              <Input
                type="datetime-local"
                value={liveEndAt}
                onChange={(e) => setLiveEndAt(e.target.value)}
                disabled={!showEventFields}
              />
            </Field>
            <Field label="Chiusura iscrizioni">
              <Input
                type="datetime-local"
                value={registrationDeadlineAt}
                onChange={(e) => setRegistrationDeadlineAt(e.target.value)}
                disabled={!showEventFields}
              />
            </Field>
            <Field label="Fuso orario">
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!showEventFields}
              />
            </Field>
            <Field label="Location" hint="Indirizzo per workshop in presenza, link Zoom per live online">
              <Input
                value={location ?? ""}
                onChange={(e) => setLocation(e.target.value)}
                disabled={!showEventFields}
              />
            </Field>
            {type === "workshop" && (
              <Field label="Posti massimi" hint="Vuoto = illimitato">
                <Input
                  type="number"
                  min={1}
                  value={maxSeats ?? ""}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMaxSeats(isNaN(v) ? null : v);
                  }}
                />
              </Field>
            )}
          </div>
        </div>
      )}

      {tab === "publish" && (
        <div className="grid grid-cols-1 gap-5 sm:max-w-md">
          <Field label="Stato">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              <option value="draft">Bozza</option>
              <option value="scheduled">Schedulato</option>
              <option value="published">Pubblicato</option>
              <option value="archived">Archiviato</option>
            </Select>
          </Field>
          {status === "scheduled" && (
            <Field label="Data di pubblicazione" required>
              <Input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => setScheduledPublishAt(e.target.value)}
              />
            </Field>
          )}
        </div>
      )}
    </form>
  );
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string }[] = [
    { id: "general", label: "Generale" },
    { id: "media", label: "Media" },
    { id: "pricing", label: "Prezzi" },
    { id: "event", label: "Evento live" },
    { id: "publish", label: "Pubblicazione" },
  ];
  return (
    <nav className="flex items-center gap-4 overflow-x-auto">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => setTab(it.id)}
          className={cn(
            "pb-3 text-sm transition-colors duration-250",
            tab === it.id
              ? "border-b-2 border-accent text-paper-50"
              : "text-paper-400 hover:text-paper-50",
          )}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-paper-400">{hint}</p>}
    </div>
  );
}
