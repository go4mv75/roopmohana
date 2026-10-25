"use client";

import { useActionState } from "react";
import { submitEnquiry } from "@/app/(store)/actions";

export function EnquiryForm({ kind }: { kind: "contact" | "customization" }) {
  const [state, action, pending] = useActionState(submitEnquiry, undefined);
  if (state?.ok)
    return (
      <div className="card p-10 text-center">
        <p className="display text-3xl">Thank you</p>
        <p className="text-muted mt-3">{state.ok}</p>
      </div>
    );
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-5">
      <input type="hidden" name="kind" value={kind} />
      <label className="sm:col-span-2">
        <span className="label">Your name</span>
        <input name="name" required className="field" autoComplete="name" />
      </label>
      <label>
        <span className="label">Email</span>
        <input name="email" type="email" className="field" autoComplete="email" />
      </label>
      <label>
        <span className="label">Phone / WhatsApp</span>
        <input name="phone" type="tel" className="field" autoComplete="tel" />
      </label>
      {kind === "customization" && (
        <label className="sm:col-span-2">
          <span className="label">Budget (optional)</span>
          <select name="budget" className="field" defaultValue="">
            <option value="">Select a range</option>
            <option>Under ₹3,000</option>
            <option>₹3,000 – ₹7,500</option>
            <option>₹7,500 – ₹15,000</option>
            <option>Above ₹15,000</option>
          </select>
        </label>
      )}
      <label className="sm:col-span-2">
        <span className="label">{kind === "customization" ? "Describe your piece" : "Message"}</span>
        <textarea
          name="message"
          required
          rows={5}
          className="field"
          placeholder={kind === "customization" ? "What would you like made? Occasion, size, names or initials, stones, and any reference links." : "How can we help?"}
        />
      </label>
      {state?.error && <p className="sm:col-span-2 text-sm text-sindoor bg-sindoor-soft px-4 py-3">{state.error}</p>}
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn-primary w-full sm:w-auto">
          {pending ? "Sending…" : kind === "customization" ? "Send my idea" : "Send message"}
        </button>
      </div>
    </form>
  );
}
