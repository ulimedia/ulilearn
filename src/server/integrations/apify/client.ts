import { env } from "@/lib/env";

export type ScrapedInstagramProfile = {
  handle: string;
  fullName: string | null;
  biography: string | null;
  followersCount: number | null;
  postsCount: number | null;
  isPrivate: boolean;
  isBusinessAccount: boolean;
  // Up to APIFY_IG_MAX_IMAGES entries, in reverse-chronological order
  latestPosts: Array<{
    imageUrl: string;
    caption: string | null;
    likes: number | null;
    timestamp: string | null;
  }>;
};

export class ApifyScrapeError extends Error {
  code: "no_token" | "timeout" | "api_error" | "not_found" | "private";
  constructor(code: ApifyScrapeError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Scrape an Instagram profile via Apify's sync-run API.
 * Returns null only when the profile doesn't exist; throws for all other
 * failure modes so the caller can decide the fallback.
 */
export async function scrapeInstagramProfile(
  handle: string,
): Promise<ScrapedInstagramProfile> {
  if (!env.APIFY_TOKEN) {
    throw new ApifyScrapeError("no_token", "APIFY_TOKEN is not configured");
  }

  const actor = env.APIFY_IG_ACTOR ?? "apify~instagram-profile-scraper";
  const maxImages = env.APIFY_IG_MAX_IMAGES ?? 6;

  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${env.APIFY_TOKEN}&timeout=40`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        usernames: [handle],
        resultsType: "details",
        resultsLimit: 1,
        addParentData: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    throw new ApifyScrapeError(
      "timeout",
      `Apify request failed: ${e instanceof Error ? e.message : "timeout"}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApifyScrapeError(
      "api_error",
      `Apify returned ${res.status}: ${body.slice(0, 200)}`,
    );
  }

  const items = (await res.json()) as IgScrapeItem[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApifyScrapeError("not_found", "No profile returned by Apify");
  }

  const profile = items[0];
  if (!profile) {
    throw new ApifyScrapeError("not_found", "Empty profile in Apify response");
  }

  if (profile.private || profile.isPrivate) {
    throw new ApifyScrapeError("private", "Profile is private");
  }

  const latestPosts = (profile.latestPosts ?? [])
    .filter((p) => p && (p.displayUrl || p.imageUrl))
    .slice(0, maxImages)
    .map((p) => ({
      imageUrl: p.displayUrl ?? p.imageUrl ?? "",
      caption: p.caption ?? null,
      likes: p.likesCount ?? null,
      timestamp: p.timestamp ?? null,
    }));

  return {
    handle,
    fullName: profile.fullName ?? null,
    biography: profile.biography ?? null,
    followersCount: profile.followersCount ?? null,
    postsCount: profile.postsCount ?? null,
    isPrivate: false,
    isBusinessAccount: Boolean(profile.isBusinessAccount),
    latestPosts,
  };
}

// Shape of individual items from Apify's instagram-profile-scraper actor.
// Kept loose because the actor tweaks fields between versions.
type IgScrapeItem = {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  postsCount?: number;
  private?: boolean;
  isPrivate?: boolean;
  isBusinessAccount?: boolean;
  latestPosts?: Array<{
    displayUrl?: string;
    imageUrl?: string;
    caption?: string;
    likesCount?: number;
    timestamp?: string;
  }>;
};
