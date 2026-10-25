import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order } from "@/db/schema";
import { store } from "../config";

const API = "https://api.razorpay.com/v1";

function auth() {
  const id = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Razorpay ${path}: ${res.status} ${JSON.stringify(body)}`);
  return body as T;
}

export async function createRazorpayOrder(order: Order) {
  const r = await call<{ id: string; amount: number; currency: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: order.total,
      currency: "INR",
      receipt: order.number,
      notes: { order_id: order.id, order_number: order.number },
    }),
  });
  return r;
}

/** Options for Razorpay Checkout (checkout.js) in the browser. Contains no secrets. */
export function checkoutOptions(order: Order, rzpOrderId: string, customerName: string) {
  return {
    key: process.env.RAZORPAY_KEY_ID!,
    order_id: rzpOrderId,
    amount: order.total,
    currency: "INR",
    name: store.name,
    description: `Order ${order.number}`,
    prefill: { name: customerName, email: order.email, contact: order.phone },
    notes: { order_id: order.id },
    theme: { color: "#7a1f2b" },
  };
}

type RzpPayment = { id: string; amount: number; status: "created" | "authorized" | "captured" | "refunded" | "failed" };

/**
 * Asks Razorpay directly whether an order has a successful payment.
 * Authorized-but-uncaptured payments are captured here so money is never left hanging.
 */
export async function fetchRazorpayPaid(rzpOrderId: string): Promise<{ paymentId: string; amount: number } | "failed" | null> {
  const { items } = await call<{ items: RzpPayment[] }>(`/orders/${rzpOrderId}/payments`);
  const captured = items.find((p) => p.status === "captured");
  if (captured) return { paymentId: captured.id, amount: captured.amount };
  const authorized = items.find((p) => p.status === "authorized");
  if (authorized) {
    const cap = await call<RzpPayment>(`/payments/${authorized.id}/capture`, {
      method: "POST",
      body: JSON.stringify({ amount: authorized.amount, currency: "INR" }),
    });
    if (cap.status === "captured") return { paymentId: cap.id, amount: cap.amount };
  }
  if (items.length && items.every((p) => p.status === "failed")) return "failed";
  return null;
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyCheckoutSignature(rzpOrderId: string, paymentId: string, signature: string) {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${rzpOrderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
