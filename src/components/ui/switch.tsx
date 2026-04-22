"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 flex-shrink-0 items-center border transition-colors duration-250 ease-soft",
          checked ? "border-accent bg-accent" : "border-paper-300/40 bg-ink-900",
        )}
      >
        <span
          className={cn(
            "inline-block h-3 w-3 transform transition-transform duration-250 ease-soft",
            checked ? "translate-x-5 bg-ink-bg" : "translate-x-1 bg-paper-300",
          )}
        />
      </button>
      {(label || description) && (
        <div className="text-sm">
          {label && <span className="text-paper-50">{label}</span>}
          {description && (
            <p className="mt-0.5 text-xs text-paper-400">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}
