"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

// Lazy-load so the 200KB bundle stays out of the public client.
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse border border-paper-300/20 bg-ink-900" />
  ),
});

export function MarkdownField({
  value,
  onChange,
  height = 320,
}: {
  value: string | null;
  onChange: (next: string) => void;
  height?: number;
}) {
  return (
    <div data-color-mode="dark">
      <MDEditor
        value={value ?? ""}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview="edit"
        visibleDragbar={false}
      />
    </div>
  );
}
