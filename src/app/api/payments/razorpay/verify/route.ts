import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnedOrder } from "@/lib/order-access";
import { syncPayment } from "@/lib/payments";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";

const body = z.object({
  orderId: z.string(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/** Called by checkout.js success handler. Signature proves the browser didn't make it up. */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const p = parsed.data;

  const order = await getOwnedOrder(p.orderId);
  if (!order || order.gatewayOrderId !== p.razorpay_order_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!verifyCheckoutSignature(p.razorpay_order_id, p.razorpay_payment_id, p.razorpay_signature)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  const fresh = await syncPayment(order);
  return NextResponse.json({ paymentStatus: fresh.paymentStatus });
}
