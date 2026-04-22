import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-paper-300/15 px-8 py-16 text-center",
        className,
      )}
    >
      <h3 className="font-display text-2xl">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-paper-300">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
