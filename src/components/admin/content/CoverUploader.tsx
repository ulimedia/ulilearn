"use client";

import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

const MAX_SIZE_MB = 5;

export function CoverUploader({
  value,
  onChange,
  bucket = "covers",
  entityId,
  aspect = "wide",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  bucket?: "covers" | "authors";
  entityId?: string;
  aspect?: "wide" | "portrait";
}) {
  const [uploading, setUploading] = useState(false);
  const createUrl = trpc.media.createUploadUrl.useMutation();

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File troppo grande (max ${MAX_SIZE_MB}MB)`);
      return;
    }
    setUploading(true);
    try {
      const res = await createUrl.mutateAsync({
        bucket,
        mimeType: file.type,
        entityId,
      });
      const putRes = await fetch(res.signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed: ${putRes.status}`);
      }
      onChange(res.publicUrl);
      toast.success("Immagine caricata");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
    }
  }

  const aspectClass = aspect === "wide" ? "aspect-[16/9]" : "aspect-[3/4]";

  return (
    <div className="space-y-3">
      <div
        className={`${aspectClass} w-full overflow-hidden border border-paper-300/30 bg-ink-900`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Cover" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-paper-400">
            Nessuna immagine
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploading}
            className="hidden"
          />
          <span className="inline-flex h-9 items-center border border-paper-300/30 bg-transparent px-3 text-sm text-paper-50 hover:bg-paper-50/5">
            {uploading ? "Caricamento…" : value ? "Sostituisci" : "Carica immagine"}
          </span>
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Rimuovi
          </Button>
        )}
        <p className="text-xs text-paper-400">JPG, PNG o WebP · max {MAX_SIZE_MB}MB</p>
      </div>
    </div>
  );
}
