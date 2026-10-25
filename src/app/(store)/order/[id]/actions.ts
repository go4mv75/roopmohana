"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { payments } from "@/lib/config";
import { getOwnedOrder } from "@/lib/order-access";
import { addOrderEvent, markOrderPaid, markPaymentFailed } from "@/lib/orders";
import { matchSubmittedUtr } from "@/lib/payments/bank-sms";

type State = { error?: string; ok?: string } | undefined;

/**
 * Direct-UPI fallback: the customer reports their UTR. If the bank SMS for it
 * has already arrived the order is confirmed on the spot; otherwise the SMS
 * (or the owner) confirms it later.
 */
export async function submitUtr(orderId: string, _: State, form: FormData): Promise<State> {
  const order = await getOwnedOrder(orderId);
  if (!order || order.paymentMethod !== "upi_direct") return { error: "Order not found." };
  if (order.paymentStatus === "paid") return { ok: "Payment already confirmed." };
  // Apps label it differently (UTR, UPI Ref No, UPI transaction ID); it's usually 12 digits,
  // but accept other reference formats too since the owner matches it by hand.
  const utr = String(form.get("utr") ?? "").replace(/[\s-]/g, "");
  if (!/^[A-Za-z0-9]{8,35}$/.test(utr)) {
    return { error: "Enter the payment reference from your UPI app (usually a 12-digit UTR / UPI Ref No)." };
  }

  const db = await getDb();
  await db
    .update(schema.orders)
    .set({ gatewayPaymentId: utr, paymentStatus: "pending" })
    .where(and(eq(schema.orders.id, orderId), inArray(schema.orders.paymentStatus, ["pending", "failed"])));
  await addOrderEvent(orderId, "utr_submitted", `Customer submitted UPI reference ${utr}`);
  const confirmed = await matchSubmittedUtr(orderId, utr);
  revalidatePath(`/order/${orderId}`);
  return { ok: confirmed ? "Payment confirmed — thank you!" : "Thanks! We’ll confirm your payment shortly." };
}

/** Local-development gateway simulator. Disabled unless PAYMENTS_MOCK=true outside production. */
export async function mockPay(orderId: string, outcome: "success" | "failure") {
  if (!payments.mock) throw new Error("Mock payments are disabled");
  const order = await getOwnedOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (outcome === "success") {
    await markOrderPaid(orderId, { amount: order.total, gatewayPaymentId: `mock_${Date.now()}`, source: "mock" });
  } else {
    await markPaymentFailed(orderId, "Payment declined (mock)");
  }
  redirect(`/order/${orderId}?from=mock`);
}
