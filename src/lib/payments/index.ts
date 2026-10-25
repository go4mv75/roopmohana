import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PAYMENT_METHODS, type Order, type PaymentMethod } from "@/db/schema";
import { payments, upi } from "../config";
import { markOrderPaid, markPaymentFailed } from "../orders";
import { createRazorpayOrder, fetchRazorpayPaid } from "./razorpay";
import { createPhonePePayment, fetchPhonePeStatus } from "./phonepe";

/** Payment methods switched on by environment configuration. */
export function enabledMethods(): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) =>
    m === "razorpay"
      ? payments.razorpay || payments.mock
      : m === "phonepe"
        ? payments.phonepe || payments.mock
        : m === "upi_direct"
          ? payments.upiDirect
          : payments.cod,
  );
}

export type PaymentStart =
  | { kind: "razorpay"; rzpOrderId: string }
  | { kind: "redirect"; url: string }
  | { kind: "upi"; }
  | { kind: "none" };

/** Kicks off payment for a freshly created order. */
export async function startPayment(order: Order): Promise<PaymentStart> {
  const db = await getDb();
  switch (order.paymentMethod) {
    case "razorpay": {
      if (!payments.razorpay) {
        if (payments.mock) return { kind: "redirect", url: `/pay/mock/${order.id}` };
        throw new Error("Razorpay is not configured");
      }
      const r = await createRazorpayOrder(order);
      await db.update(schema.orders).set({ gatewayOrderId: r.id }).where(eq(schema.orders.id, order.id));
      return { kind: "razorpay", rzpOrderId: r.id };
    }
    case "phonepe": {
      if (!payments.phonepe) {
        if (payments.mock) return { kind: "redirect", url: `/pay/mock/${order.id}` };
        throw new Error("PhonePe is not configured");
      }
      // Each attempt needs a unique merchantOrderId; we keep the latest on the order.
      const merchantOrderId = `${order.id}-${Date.now().toString(36)}`;
      const r = await createPhonePePayment(order, merchantOrderId);
      await db.update(schema.orders).set({ gatewayOrderId: merchantOrderId }).where(eq(schema.orders.id, order.id));
      return { kind: "redirect", url: r.redirectUrl };
    }
    case "upi_direct":
      return { kind: "upi" };
    case "cod":
      return { kind: "none" };
  }
}

/**
 * Brings our record in line with the gateway. Called by the status page poll,
 * the browser callback and webhooks — the gateway is always the source of truth.
 */
export async function syncPayment(order: Order, gatewayOrderId = order.gatewayOrderId): Promise<Order> {
  if (order.paymentStatus === "paid") return order;
  try {
    if (order.paymentMethod === "razorpay" && payments.razorpay && gatewayOrderId) {
      const r = await fetchRazorpayPaid(gatewayOrderId);
      if (r === "failed") await markPaymentFailed(order.id, "Payment failed at Razorpay");
      else if (r) await markOrderPaid(order.id, { amount: r.amount, gatewayPaymentId: r.paymentId, source: "razorpay" });
    } else if (order.paymentMethod === "phonepe" && payments.phonepe && gatewayOrderId) {
      const s = await fetchPhonePeStatus(gatewayOrderId);
      if (s.state === "COMPLETED") {
        await markOrderPaid(order.id, { amount: s.amount, gatewayPaymentId: s.transactionId, source: "phonepe" });
      } else if (s.state === "FAILED") {
        await markPaymentFailed(order.id, "Payment failed or expired at PhonePe");
      }
    }
  } catch (err) {
    console.error("[payments] sync failed", order.id, err);
  }
  const db = await getDb();
  const [fresh] = await db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
  return fresh;
}

/** upi://pay deep link (NPCI UPI linking spec). Opens GPay / PhonePe / Paytm / BHIM on phones. */
export function upiLink(order: Order) {
  // No `tr` (merchant reference): apps may reject it when the payee is a personal VPA.
  // The order number travels in the note (`tn`) instead.
  const params = new URLSearchParams({
    pa: upi.vpa,
    pn: upi.payeeName,
    am: (order.total / 100).toFixed(2),
    cu: "INR",
    tn: `Order ${order.number}`,
  });
  // Some UPI apps reject a percent-encoded "@" in the payee address.
  return `upi://pay?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
}
