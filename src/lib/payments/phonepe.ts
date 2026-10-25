import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Order } from "@/db/schema";
import { siteUrl } from "../config";

/**
 * PhonePe Payment Gateway — Standard Checkout v2.
 * The customer is redirected to PhonePe's hosted page which pushes a collect
 * request / opens their UPI app; we then watch the order status.
 */
const sandbox = process.env.PHONEPE_ENV !== "production";
const PG_BASE = sandbox ? "https://api-preprod.phonepe.com/apis/pg-sandbox" : "https://api.phonepe.com/apis/pg";
const TOKEN_URL = sandbox
  ? "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token"
  : "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";

let cached: { token: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.PHONEPE_CLIENT_ID!,
      client_version: process.env.PHONEPE_CLIENT_VERSION ?? "1",
      client_secret: process.env.PHONEPE_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  const body = (await res.json()) as { access_token?: string; expires_at?: number };
  if (!res.ok || !body.access_token) throw new Error(`PhonePe auth failed: ${res.status} ${JSON.stringify(body)}`);
  // expires_at is epoch seconds
  cached = { token: body.access_token, expiresAt: (body.expires_at ?? Date.now() / 1000 + 900) * 1000 };
  return cached.token;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(PG_BASE + path, {
    ...init,
    headers: { Authorization: `O-Bearer ${await token()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PhonePe ${path}: ${res.status} ${JSON.stringify(body)}`);
  return body as T;
}

export async function createPhonePePayment(order: Order, merchantOrderId: string): Promise<{ redirectUrl: string; phonepeOrderId: string }> {
  const r = await call<{ orderId: string; state: string; redirectUrl: string }>("/checkout/v2/pay", {
    method: "POST",
    body: JSON.stringify({
      merchantOrderId,
      amount: order.total,
      expireAfter: 1200,
      metaInfo: { udf1: order.number },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Roop Mohana order ${order.number}`,
        merchantUrls: { redirectUrl: `${siteUrl()}/order/${order.id}?from=phonepe` },
      },
    }),
  });
  return { redirectUrl: r.redirectUrl, phonepeOrderId: r.orderId };
}

type PhonePeStatus = {
  orderId: string;
  state: "PENDING" | "COMPLETED" | "FAILED";
  amount: number;
  paymentDetails?: { transactionId: string; state: string; amount: number; paymentMode?: string }[];
};

export async function fetchPhonePeStatus(merchantOrderId: string) {
  const s = await call<PhonePeStatus>(`/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=false`);
  const done = s.paymentDetails?.find((p) => p.state === "COMPLETED");
  return {
    state: s.state,
    amount: s.amount,
    transactionId: done?.transactionId ?? s.paymentDetails?.[0]?.transactionId ?? null,
  };
}

/** PhonePe webhook auth: Authorization header = SHA256("username:password"). */
export function verifyPhonePeWebhook(authHeader: string | null) {
  const user = process.env.PHONEPE_WEBHOOK_USERNAME;
  const pass = process.env.PHONEPE_WEBHOOK_PASSWORD;
  if (!user || !pass || !authHeader) return false;
  const expected = createHash("sha256").update(`${user}:${pass}`).digest("hex");
  const got = authHeader.replace(/^SHA256\s*/i, "").trim().toLowerCase();
  return expected.length === got.length && timingSafeEqual(Buffer.from(expected), Buffer.from(got));
}
