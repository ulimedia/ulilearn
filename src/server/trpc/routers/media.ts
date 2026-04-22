import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { adminProcedure, createTRPCRouter } from "../init";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const BUCKET_PREFIXES: Record<string, string> = {
  covers: "content",
  authors: "author",
};

export const mediaRouter = createTRPCRouter({
  /**
   * Generate a signed upload URL for Supabase Storage. The client PUTs the
   * file directly, then calls content.upsert / author.upsert with the
   * returned `publicUrl`.
   */
  createUploadUrl: adminProcedure
    .input(
      z.object({
        bucket: z.enum(["covers", "authors"]),
        mimeType: z.string().trim(),
        entityId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!ALLOWED_MIME.has(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Formato non consentito (usa JPG, PNG o WebP).",
        });
      }
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const prefix = input.entityId ?? BUCKET_PREFIXES[input.bucket] ?? "misc";
      const path = `${prefix}/${randomUUID()}.${ext}`;

      const admin = getSupabaseAdmin();
      const { data, error } = await admin.storage
        .from(input.bucket)
        .createSignedUploadUrl(path);
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Storage error: ${error?.message ?? "unknown"}`,
        });
      }
      const { data: publicData } = admin.storage
        .from(input.bucket)
        .getPublicUrl(path);

      return {
        signedUrl: data.signedUrl,
        token: data.token,
        path,
        publicUrl: publicData.publicUrl,
      };
    }),
});
