import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { processBankSms } from "@/lib/payments/bank-sms";

/**
 * Receives bank SMS forwarded by the owner's phone ("Incoming SMS to URL
 * forwarder" app, or any forwarder that POSTs JSON / form data).
 *
 * Auth (SMS_WEBHOOK_SECRET), either:
 *   - X-Signature: hex HMAC-SHA256 of the raw body (the app's "Sign with HMAC" option), or
 *   - ?key=<secret> in the URL, for forwarders that can't sign.
 */
const same = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

function authorised(req: NextRequest, raw: string, secret: string) {
  const sig = req.headers.get("x-signature")?.trim().toLowerCase();
  if (sig && same(sig, createHmac("sha256", secret).update(raw).digest("hex"))) return true;
  const key = req.nextUrl.searchParams.get("key");
  return !!key && same(key, secret);
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) if (typeof obj[k] === "string" && obj[k]) return obj[k] as string;
  return "";
}

export async function POST(req: NextRequest) {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "SMS verification is not configured (SMS_WEBHOOK_SECRET)" }, { status: 503 });
  }
  const raw = await req.text();
  if (!authorised(req, raw, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  const from = pick(body, ["from", "sender", "address", "phone"]);
  const text = pick(body, ["text", "message", "body", "msg", "content"]);
  if (!from || !text) return NextResponse.json({ result: "ignored", reason: "missing from/text" });

  const result = await processBankSms(from, text);
  if (result.result !== "ignored") console.info("[bank-sms]", result);
  // Always 200 for authenticated requests so the phone app doesn't retry forever.
  return NextResponse.json(result);
}
