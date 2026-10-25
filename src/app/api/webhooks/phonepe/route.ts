import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { syncPayment } from "@/lib/payments";
import { verifyPhonePeWebhook } from "@/lib/payments/phonepe";

/**
 * PhonePe webhook (Business dashboard → Developer settings → Webhook).
 * Events: checkout.order.completed, checkout.order.failed.
 * We re-check the order with PhonePe's status API before trusting it.
 */
export async function POST(req: Request) {
  if (!verifyPhonePeWebhook(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { payload?: { merchantOrderId?: string } } | null;
  const id = body?.payload?.merchantOrderId;
  if (!id) return NextResponse.json({ ok: true });

  const db = await getDb();
  // merchantOrderId is "<orderId>-<attempt>"
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id.split("-")[0]));
  if (order) await syncPayment(order, id);
  return NextResponse.json({ ok: true });
}
