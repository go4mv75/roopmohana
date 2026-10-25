"use client";

import { useOptimistic, useTransition } from "react";
import { toggleProduct } from "@/app/admin/actions";

export function ProductToggle({ id, field, on }: { id: number; field: "active" | "featured"; on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <button
      role="switch"
      aria-checked={optimistic}
      aria-label={field === "active" ? "Visible in store" : "Featured on homepage"}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await toggleProduct(id, field);
        })
      }
      className={`relative w-9 h-5 rounded-full transition-colors ${optimistic ? "bg-sindoor" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-paper shadow transition-transform ${optimistic ? "translate-x-4" : ""}`} />
    </button>
  );
}
