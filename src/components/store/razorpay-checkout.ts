"use client";

type Router = { push: (href: string) => void };

type RazorpayOptions = Record<string, unknown> & { order_id: string };
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: () => void) => void };
  }
}

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout. On success the signature is verified server-side;
 * either way the customer lands on the order page, which watches the status.
 */
export async function openRazorpay(options: RazorpayOptions, orderId: string, router: Router) {
  try {
    await loadScript();
  } catch {
    router.push(`/order/${orderId}`);
    return;
  }
  const rzp = new window.Razorpay!({
    ...options,
    handler: async (resp: RazorpaySuccess) => {
      await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...resp }),
      }).catch(() => {});
      router.push(`/order/${orderId}?placed=1`);
    },
    modal: {
      ondismiss: () => router.push(`/order/${orderId}`),
      confirm_close: true,
    },
  });
  rzp.open();
}
