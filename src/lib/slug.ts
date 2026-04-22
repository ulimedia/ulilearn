import slugify from "slugify";

const OPTS = { lower: true, strict: true, locale: "it" };

export function toSlug(source: string): string {
  return slugify(source, OPTS).slice(0, 80) || "contenuto";
}
