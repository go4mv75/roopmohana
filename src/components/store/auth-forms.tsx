"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, resetPassword, type FormState } from "@/lib/auth/actions";

function Notice({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-sindoor bg-sindoor-soft px-4 py-3">
        {state.error}
      </p>
    );
  if (state?.ok) return <p className="text-sm text-success bg-[#e6f0ea] px-4 py-3">{state.ok}</p>;
  return null;
}

export function GoogleButton({ next }: { next: string }) {
  return (
    <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="btn-outline w-full normal-case tracking-normal text-[14px] font-medium">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </a>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      <Notice state={state} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <div>
        <div className="flex justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-xs text-muted hover:text-sindoor">Forgot?</Link>
        </div>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-5">
      <Notice state={state} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" name="name" autoComplete="name" required className="field" />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="r-email">Email</label>
          <input id="r-email" name="email" type="email" autoComplete="email" required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Mobile</label>
          <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" required className="field" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="r-password">Password</label>
        <input id="r-password" name="password" type="password" autoComplete="new-password" minLength={8} required className="field" />
        <p className="text-xs text-muted mt-1.5">At least 8 characters.</p>
      </div>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Creating account…" : "Create account"}</button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-5">
      <Notice state={state} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="field" />
      </div>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <Notice state={state} />
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="field" />
      </div>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "Set new password"}</button>
    </form>
  );
}
