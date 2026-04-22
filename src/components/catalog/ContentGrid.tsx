import { ContentCard, type ContentCardData } from "./ContentCard";
import { EmptyState } from "@/components/ui/empty-state";

export function ContentGrid({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: ContentCardData[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? "Nessun contenuto"}
        description={emptyDescription ?? "Torna presto: ne stanno arrivando."}
      />
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {items.map((c) => (
        <ContentCard key={c.id} content={c} />
      ))}
    </div>
  );
}
