import { NextResponse } from "next/server";
import { getOwnedOrder } from "@/lib/order-access";
import { syncPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

/** Polled by the order page while a payment is in flight. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const { id } = await ctx.params;
  let order = await getOwnedOrder(id);
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (order.paymentStatus === "pending") order = await syncPayment(order);
  return NextResponse.json(
    { status: order.status, paymentStatus: order.paymentStatus },
    { headers: { "Cache-Control": "no-store" } },
  );
}
