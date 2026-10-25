import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { syncPayment } from "@/lib/payments";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks).
 * Subscribe to: payment.captured, payment.failed, order.paid.
 * The event only tells us *which* order to re-check; status comes from the API.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    event: string;
    payload?: {
      payment?: { entity?: { order_id?: string; notes?: { order_id?: string } } };
      order?: { entity?: { id?: string; notes?: { order_id?: string } } };
    };
  };
  const rzpOrderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id;
  const ourId = event.payload?.payment?.entity?.notes?.order_id ?? event.payload?.order?.entity?.notes?.order_id;
  if (!rzpOrderId && !ourId) return NextResponse.json({ ok: true });

  const db = await getDb();
  const conds = [];
  if (ourId) conds.push(eq(schema.orders.id, ourId));
  if (rzpOrderId) conds.push(eq(schema.orders.gatewayOrderId, rzpOrderId));
  const [order] = await db.select().from(schema.orders).where(or(...conds)).limit(1);
  // Check the Razorpay order named in the event (may be an earlier attempt).
  if (order) await syncPayment(order, rzpOrderId ?? order.gatewayOrderId);
  return NextResponse.json({ ok: true });
}
