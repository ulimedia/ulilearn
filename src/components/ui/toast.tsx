"use client";

import { Toaster, toast } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "#151414",
          color: "#FAF9F7",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 0,
          fontFamily: "var(--font-open-sans)",
        },
      }}
    />
  );
}

export { toast };
