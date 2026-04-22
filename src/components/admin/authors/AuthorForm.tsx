"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CoverUploader } from "@/components/admin/content/CoverUploader";
import { MarkdownField } from "@/components/admin/content/MarkdownField";
import { ROUTES } from "@/lib/constants";
import { toSlug } from "@/lib/slug";

export type AuthorFormInitial = {
  id?: string;
  fullName?: string;
  slug?: string;
  bioMd?: string | null;
  portraitUrl?: string | null;
  websiteUrl?: string | null;
  socialLinks?: {
    instagram?: string | null;
    youtube?: string | null;
    twitter?: string | null;
    website?: string | null;
  } | null;
};

export function AuthorForm({ initial }: { initial?: AuthorFormInitial }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [bioMd, setBioMd] = useState(initial?.bioMd ?? "");
  const [portraitUrl, setPortraitUrl] = useState<string | null>(
    initial?.portraitUrl ?? null,
  );
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [instagram, setInstagram] = useState(
    initial?.socialLinks?.instagram ?? "",
  );
  const [youtube, setYoutube] = useState(initial?.socialLinks?.youtube ?? "");
  const [twitter, setTwitter] = useState(initial?.socialLinks?.twitter ?? "");

  const upsert = trpc.author.upsert.useMutation();
  const del = trpc.author.delete.useMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await upsert.mutateAsync({
        id: initial?.id,
        fullName: fullName.trim(),
        slug: slug.trim() || undefined,
        bioMd: bioMd || null,
        portraitUrl,
        websiteUrl: websiteUrl.trim() || null,
        socialLinks: {
          instagram: instagram.trim() || null,
          youtube: youtube.trim() || null,
          twitter: twitter.trim() || null,
        },
      });
      toast.success("Salvato");
      if (!initial?.id) {
        router.push(ROUTES.admin.authorEdit(res.id));
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial?.id) return;
    if (!confirm(`Eliminare ${fullName}?`)) return;
    try {
      await del.mutateAsync({ id: initial.id });
      toast.success("Eliminato");
      router.push(ROUTES.admin.authors);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="space-y-1.5">
            <Label>
              Nome e cognome<span className="ml-1 text-accent">*</span>
            </Label>
            <Input
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (!slugTouched) setSlug(toSlug(e.target.value));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Biografia</Label>
            <MarkdownField value={bioMd} onChange={setBioMd} height={280} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sito web</Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/handle"
              />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube</Label>
              <Input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Twitter / X</Label>
              <Input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/handle"
              />
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Ritratto</Label>
            <CoverUploader
              value={portraitUrl}
              onChange={setPortraitUrl}
              bucket="authors"
              entityId={initial?.id}
              aspect="portrait"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-paper-300/10 pt-6">
        <div>
          {initial?.id && (
            <Button type="button" variant="ghost" size="sm" onClick={handleDelete}>
              Elimina autore
            </Button>
          )}
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvo…" : "Salva"}
        </Button>
      </div>
    </form>
  );
}
