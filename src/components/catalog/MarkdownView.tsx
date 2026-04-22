/**
 * Minimal markdown → HTML renderer (no external library) for short text:
 * paragraphs separated by blank lines, **bold**, *italic*, [text](url).
 * Good enough for editorial bios + descriptions; if we ever need full
 * markdown (lists, headings, tables) swap with `react-markdown`.
 */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(s: string) {
  return escapeHtml(s)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-accent underline hover:no-underline">$1</a>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
}

export function MarkdownView({ source }: { source: string | null | undefined }) {
  if (!source) return null;
  const paragraphs = source
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="text-paper-100"
          dangerouslySetInnerHTML={{ __html: inlineFormat(p).replace(/\n/g, "<br/>") }}
        />
      ))}
    </div>
  );
}
