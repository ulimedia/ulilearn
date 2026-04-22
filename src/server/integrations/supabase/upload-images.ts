import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { FetchedImage } from "@/server/integrations/anthropic/lead-magnet-prompt";

const BUCKET = "lead-images";

/**
 * Upload downloaded Instagram images to Supabase Storage under a lead-specific
 * prefix. Returns the public URLs in the same order as the input (null for
 * entries that failed).
 */
export async function uploadLeadImages(params: {
  leadId: string;
  images: Array<FetchedImage | null>;
}): Promise<Array<string | null>> {
  const supabase = getSupabaseAdmin();
  const uploads = await Promise.all(
    params.images.map(async (img, i) => {
      if (!img) return null;
      const ext = mediaTypeToExt(img.mediaType);
      const path = `${params.leadId}/${i}.${ext}`;
      try {
        const { error } = await supabase.storage.from(BUCKET).upload(path, img.bytes, {
          contentType: img.mediaType,
          upsert: true,
          cacheControl: "31536000",
        });
        if (error) {
          console.warn(`[uploadLeadImages] upload ${path} failed: ${error.message}`);
          return null;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        console.warn(
          `[uploadLeadImages] unexpected error on ${path}: ${
            e instanceof Error ? e.message : "unknown"
          }`,
        );
        return null;
      }
    }),
  );
  return uploads;
}

function mediaTypeToExt(mt: FetchedImage["mediaType"]): string {
  switch (mt) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}
