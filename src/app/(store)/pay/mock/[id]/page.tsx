import { notFound } from "next/navigation";
import { payments } from "@/lib/config";
import { money } from "@/lib/format";
import { getOwnedOrder } from "@/lib/order-access";
import { mockPay } from "@/app/(store)/order/[id]/actions";

export const metadata = { title: "Test payment", robots: { index: false } };

/** Stand-in for a hosted gateway page during local development (PAYMENTS_MOCK=true). */
export default async function MockPayPage({ params }: { params: Promise<{ id: string }> }) {
  if (!payments.mock) notFound();
  const { id } = await params;
  const order = await getOwnedOrder(id);
  if (!order) notFound();

  return (
    <section className="container-x py-24 max-w-md text-center">
      <p className="eyebrow text-warning">Test mode — no real money moves</p>
      <h1 className="display text-4xl mt-4">Simulated {order.paymentMethod === "phonepe" ? "PhonePe" : "Razorpay"} payment</h1>
      <p className="display text-5xl mt-8">{money(order.total)}</p>
      <p className="text-sm text-muted mt-2">Order {order.number}</p>
      <div className="grid gap-3 mt-10">
        <form action={mockPay.bind(null, order.id, "success")}>
          <button className="btn-accent w-full">Approve payment</button>
        </form>
        <form action={mockPay.bind(null, order.id, "failure")}>
          <button className="btn-outline w-full">Decline payment</button>
        </form>
      </div>
    </section>
  );
}
