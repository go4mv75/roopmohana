"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { retryPayment } from "@/app/(store)/checkout/actions";
import { submitUtr } from "@/app/(store)/order/[id]/actions";
import { openRazorpay } from "./razorpay-checkout";

/**
 * Polls the server (which asks the gateway) until the payment settles,
 * then refreshes the page. Backs off gently and stops after `maxMinutes`
 * (longer for direct UPI, where the owner confirms by hand).
 */
export function PaymentWatcher({ orderId, maxMinutes = 15 }: { orderId: string; maxMinutes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    let delay = 2500;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const r = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (r.ok) {
          const s = (await r.json()) as { paymentStatus: string; status: string };
          if (s.paymentStatus === "paid" || s.paymentStatus === "failed" || s.status !== "pending_payment") {
            router.refresh();
            return;
          }
        }
      } catch {}
      if (Date.now() - started > maxMinutes * 60_000) return;
      delay = Math.min(delay * 1.15, 8000);
      timer = setTimeout(tick, document.hidden ? 10_000 : delay);
    };
    timer = setTimeout(tick, 1200);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId, router, maxMinutes]);
  return null;
}

export function RetryPayment({ orderId, label = "Try payment again", subtle = false }: { orderId: string; label?: string; subtle?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        disabled={pending}
        className={subtle ? "text-xs uppercase tracking-[0.14em] underline text-ink-soft hover:text-sindoor" : "btn-accent"}
        onClick={() =>
          start(async () => {
            const res = await retryPayment(orderId);
            if ("error" in res) return setError(res.error);
            if (res.start.kind === "razorpay" && res.razorpay) return openRazorpay(res.razorpay, orderId, router);
            if (res.start.kind === "redirect") {
              if (res.start.url.startsWith("/")) router.push(res.start.url);
              else window.location.href = res.start.url;
              return;
            }
            // Direct UPI: payment is pending again, so the page shows the QR once more.
            router.refresh();
          })
        }
      >
        {pending ? "Opening…" : label}
      </button>
      {error && <p className="text-xs text-sindoor">{error}</p>}
    </div>
  );
}

export function UtrForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(submitUtr.bind(null, orderId), undefined);
  if (state?.ok) return <p className="text-sm bg-ivory px-4 py-3">{state.ok}</p>;
  return (
    <form action={action} className="space-y-2">
      <label className="label" htmlFor="utr">UTR / UPI reference number</label>
      <div className="flex gap-2">
        <input id="utr" name="utr" maxLength={40} placeholder="e.g. 412345678901" className="field font-mono" autoComplete="off" required />
        <button disabled={pending} className="btn-primary px-5 shrink-0">{pending ? "…" : "Submit"}</button>
      </div>
      <p className="text-xs text-muted">
        Find it in your payment receipt: “UTR” (PhonePe), “UPI transaction ID” (Google Pay), “UPI Ref. No.” (Paytm).
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-sindoor bg-sindoor-soft px-4 py-3">
          {state.error}
        </p>
      )}
    </form>
  );
}
