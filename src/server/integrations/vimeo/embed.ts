/**
 * Build a Vimeo iframe embed URL for a given video ID.
 * dnt=1 disables Vimeo's marketing tracking (§6.3 #1).
 *
 * Full server-side gating (API /api/content/[id]/stream) decides WHETHER
 * to emit this URL; this helper just assembles it once authorization passes.
 */
export function buildVimeoEmbedUrl(vimeoId: string, opts?: { autoplay?: boolean }) {
  const params = new URLSearchParams({
    dnt: "1",
    title: "0",
    byline: "0",
    portrait: "0",
  });
  if (opts?.autoplay) params.set("autoplay", "1");
  return `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;
}
