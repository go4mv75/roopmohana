"use client";

import { useActionState } from "react";
import { subscribe } from "@/app/(store)/actions";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, undefined);
  if (state?.ok) return <p className="text-sm text-paper">{state.ok}</p>;
  return (
    <form action={action} className="flex border-b border-paper/30 focus-within:border-paper">
      <input
        type="email"
        name="email"
        required
        placeholder="Your email"
        aria-label="Email address"
        className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-paper/40 text-paper"
      />
      <button disabled={pending} className="text-[11px] font-semibold tracking-[0.18em] uppercase text-paper hover:text-sindoor-soft">
        {pending ? "…" : "Join"}
      </button>
      {state?.error && <p className="text-xs text-sindoor-soft">{state.error}</p>}
    </form>
  );
}
