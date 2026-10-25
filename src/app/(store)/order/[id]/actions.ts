"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { payments } from "@/lib/config";
import { getOwnedOrder } from "@/lib/order-access";
import { addOrderEvent, markOrderPaid, markPaymentFailed } from "@/lib/orders";

type State = { error?: string; ok?: string } | undefined;

/** Direct-UPI: the customer reports their UTR; the owner verifies it in the bank app. */
export async function submitUtr(orderId: string, _: State, form: FormData): Promise<State> {
  const order = await getOwnedOrder(orderId);
  if (!order || order.paymentMethod !== "upi_direct") return { error: "Order not found." };
  if (order.paymentStatus === "paid") return { ok: "Payment already confirmed." };
  const utr = String(form.get("utr") ?? "").replace(/\s/g, "");
  if (!/^\d{12}$/.test(utr)) return { error: "UTR / UPI reference is the 12-digit number shown in your UPI app." };

  const db = await getDb();
  await db
    .update(schema.orders)
    .set({ gatewayPaymentId: utr })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.paymentStatus, "pending")));
  await addOrderEvent(orderId, "utr_submitted", `Customer submitted UPI reference ${utr}`);
  revalidatePath(`/order/${orderId}`);
  return { ok: "Thanks! We’ll confirm your payment shortly." };
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
