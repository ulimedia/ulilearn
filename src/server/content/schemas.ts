import { z } from "zod";

export const contentTypeEnum = z.enum([
  "lecture",
  "corso",
  "documentario",
  "masterclass",
  "workshop",
]);

export const contentFormatEnum = z.enum([
  "on_demand",
  "live_online",
  "live_hybrid",
  "live_in_person",
]);

export const contentStatusEnum = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

/**
 * Full editable shape of a content_item. Used by both the upsert mutation and
 * the admin form. Validation intentionally permissive on optional fields;
 * cross-field rules live in `refineContentInput` below.
 */
export const contentUpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2).max(200),
    subtitle: z.string().trim().max(300).nullish(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]*$/, "Solo lettere minuscole, numeri e trattini")
      .max(80)
      .optional(),
    type: contentTypeEnum,
    format: contentFormatEnum.default("on_demand"),
    descriptionMd: z.string().max(20000).nullish(),
    coverImageUrl: z.string().url().nullish(),
    authorId: z.string().uuid().nullish(),
    vimeoVideoId: z
      .string()
      .trim()
      .regex(/^\d+$/, "Solo l'ID numerico Vimeo, es. 123456789")
      .nullish(),
    durationSeconds: z.coerce.number().int().min(0).default(0),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    isFeatured: z.boolean().default(false),
    isFree: z.boolean().default(false),

    // Live event fields
    liveStartAt: z.coerce.date().nullish(),
    liveEndAt: z.coerce.date().nullish(),
    registrationDeadlineAt: z.coerce.date().nullish(),
    timezone: z.string().trim().max(64).default("Europe/Rome"),
    location: z.string().trim().max(300).nullish(),

    // Pricing
    isPurchasable: z.boolean().default(false),
    standalonePriceCents: z.coerce.number().int().min(0).nullish(),
    subscriberPriceCentsOverride: z.coerce.number().int().min(0).nullish(),

    // Seats
    maxSeats: z.coerce.number().int().min(1).nullish(),

    // Status
    status: contentStatusEnum.default("draft"),
    scheduledPublishAt: z.coerce.date().nullish(),
  })
  .superRefine((data, ctx) => {
    // If it's a live format, liveStartAt is required
    if (data.format !== "on_demand" && !data.liveStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["liveStartAt"],
        message: "Data e ora di inizio richieste per i formati live.",
      });
    }
    // If purchasable, need a price
    if (data.isPurchasable) {
      if (!data.standalonePriceCents || data.standalonePriceCents <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["standalonePriceCents"],
          message: "Prezzo richiesto per i contenuti acquistabili.",
        });
      }
    }
    // If scheduled, need publish date in future
    if (data.status === "scheduled") {
      if (!data.scheduledPublishAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledPublishAt"],
          message: "Imposta la data di pubblicazione.",
        });
      } else if (data.scheduledPublishAt.getTime() < Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduledPublishAt"],
          message: "La data di pubblicazione deve essere futura.",
        });
      }
    }
    // If live ends before it starts
    if (data.liveEndAt && data.liveStartAt && data.liveEndAt < data.liveStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["liveEndAt"],
        message: "La fine non può precedere l'inizio.",
      });
    }
  });

export type ContentUpsertInput = z.infer<typeof contentUpsertSchema>;

export const contentListInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  type: contentTypeEnum.optional(),
  format: contentFormatEnum.optional(),
  status: contentStatusEnum.optional(),
  authorId: z.string().uuid().optional(),
  isPurchasable: z.boolean().optional(),
  search: z.string().trim().max(200).optional(),
});

export const authorUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]*$/, "Solo lettere minuscole, numeri e trattini")
    .max(80)
    .optional(),
  bioMd: z.string().max(10000).nullish(),
  portraitUrl: z.string().url().nullish(),
  websiteUrl: z.string().url().nullish(),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(200).nullish(),
      youtube: z.string().trim().max(200).nullish(),
      twitter: z.string().trim().max(200).nullish(),
      website: z.string().trim().max(300).nullish(),
    })
    .partial()
    .nullish(),
});

export type AuthorUpsertInput = z.infer<typeof authorUpsertSchema>;
