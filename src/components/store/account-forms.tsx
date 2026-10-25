"use client";

import { useActionState, useTransition } from "react";
import { changePassword, deleteAddress, updateProfile } from "@/app/(store)/account/actions";

function Msg({ s }: { s: { ok?: string; error?: string } | undefined }) {
  if (!s) return null;
  return <p className={`text-xs ${s.error ? "text-sindoor" : "text-success"}`}>{s.error ?? s.ok}</p>;
}

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <input name="name" defaultValue={name} className="field" aria-label="Name" required />
      <input name="phone" defaultValue={phone} className="field" aria-label="Mobile" placeholder="Mobile number" required />
      <Msg s={state} />
      <button disabled={pending} className="btn-outline w-full h-11">{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}

export function PasswordForm({ needsCurrent }: { needsCurrent: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      {needsCurrent && <input name="current" type="password" autoComplete="current-password" className="field" placeholder="Current password" required />}
      <input name="next" type="password" autoComplete="new-password" minLength={8} className="field" placeholder="New password" required />
      <Msg s={state} />
      <button disabled={pending} className="btn-outline w-full h-11">{pending ? "Saving…" : "Update password"}</button>
    </form>
  );
}

export function DeleteAddressButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => deleteAddress(id))} className="text-xs text-muted hover:text-sindoor h-fit">
      {pending ? "…" : "Remove"}
    </button>
  );
}
