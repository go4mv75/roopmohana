import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { getOrderWithItems } from "@/lib/orders";
import { money, formatDateTime, paymentLabel } from "@/lib/format";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { OrderStatusForm, ManualPaymentButtons, PrintButton } from "@/components/admin/order-forms";
import { saveAdminNotes } from "../../actions";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getOrderWithItems(id);
  if (!data) notFound();
  const { order: o, items, events } = data;
  const a = o.shippingAddress;
  const manual = (o.paymentMethod === "upi_direct" || o.paymentMethod === "cod") && o.paymentStatus !== "paid";

  return (
    <>
      <Link href="/admin/orders" className="text-xs flex items-center gap-1 text-muted hover:text-ink mb-4 print:hidden">
        <ArrowLeft size={14} /> All orders
      </Link>
      <PageHeader
        title={`Order ${o.number}`}
        sub={`Placed ${formatDateTime(o.createdAt)}`}
        action={
          <div className="flex gap-2 items-center print:hidden">
            <StatusBadge value={o.paymentStatus} />
            <StatusBadge value={o.status} />
            <PrintButton />
          </div>
        }
      />

      <div className="grid xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <Panel title={`Items (${items.reduce((n, i) => n + i.quantity, 0)})`}>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex gap-4 items-center px-5 py-4">
                  <div className="relative w-14 h-16 bg-sand shrink-0">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted">{i.sku ? `SKU ${i.sku} · ` : ""}{money(i.unitPrice)} × {i.quantity}</p>
                  </div>
                  <p className="font-semibold">{money(i.unitPrice * i.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="border-t border-line px-5 py-4 space-y-1.5 text-sm">
              <Row k="Subtotal" v={money(o.subtotal)} />
              {o.discount > 0 && <Row k={`Discount (${o.couponCode})`} v={`− ${money(o.discount)}`} />}
              <Row k="Shipping" v={o.shippingFee ? money(o.shippingFee) : "Free"} />
              <Row k="Total" v={money(o.total)} bold />
            </dl>
          </Panel>

          {manual && (
            <Panel title={o.paymentMethod === "cod" ? "Cash on delivery" : "Verify UPI payment"}>
              <div className="p-5 text-sm space-y-4">
                {o.paymentMethod === "upi_direct" ? (
                  o.gatewayPaymentId ? (
                    <p>
                      Customer reports UTR <b className="font-mono text-base">{o.gatewayPaymentId}</b> for <b>{money(o.total)}</b>. Check your bank / UPI
                      app for this reference, then confirm.
                    </p>
                  ) : (
                    <p className="text-muted">Waiting for the customer to pay and submit their UPI reference.</p>
                  )
                ) : (
                  <p className="text-muted">Collect {money(o.total)} on delivery. It is marked paid automatically when you set the order to Delivered.</p>
                )}
                {o.paymentMethod === "upi_direct" && <ManualPaymentButtons orderId={o.id} canReject={!!o.gatewayPaymentId} />}
              </div>
            </Panel>
          )}

          <Panel title="Timeline">
            <ol className="px-5 py-4 space-y-3 text-sm">
              {events
                .slice()
                .reverse()
                .map((e) => (
                  <li key={e.id} className="flex gap-4">
                    <span className="text-xs text-muted whitespace-nowrap w-36 shrink-0">{formatDateTime(e.createdAt)}</span>
                    <span>{e.message}</span>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Fulfilment">
            <div className="p-5 print:hidden">
              <OrderStatusForm
                key={`${o.status}-${o.paymentStatus}-${o.trackingNumber}`}
                orderId={o.id}
                status={o.status}
                carrier={o.trackingCarrier ?? ""}
                tracking={o.trackingNumber ?? ""}
              />
            </div>
          </Panel>
          <Panel title="Customer">
            <div className="p-5 text-sm space-y-2">
              <p className="font-semibold">{a.name}</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-muted" /><a href={`mailto:${o.email}`} className="underline">{o.email}</a></p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-muted" /><a href={`tel:${o.phone}`} className="underline">{o.phone}</a></p>
              <p className="text-xs text-muted pt-2">{paymentLabel[o.paymentMethod]}</p>
              {o.gatewayPaymentId && <p className="text-xs text-muted">Ref: <span className="font-mono">{o.gatewayPaymentId}</span></p>}
              {o.paidAt && <p className="text-xs text-muted">Paid {formatDateTime(o.paidAt)}</p>}
            </div>
          </Panel>
          <Panel title="Ship to">
            <div className="p-5 text-sm leading-relaxed">
              <p className="font-semibold">{a.name}</p>
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              <p>{a.city}, {a.state} — {a.pincode}</p>
              <p>{a.phone}</p>
            </div>
          </Panel>
          {o.notes && (
            <Panel title="Customer note">
              <p className="p-5 text-sm whitespace-pre-wrap">{o.notes}</p>
            </Panel>
          )}
          <Panel title="Private notes">
            <form action={saveAdminNotes.bind(null, o.id)} className="p-5 space-y-3 print:hidden">
              <textarea name="adminNotes" defaultValue={o.adminNotes ?? ""} rows={3} className="field text-sm" placeholder="Only you can see this" />
              <button className="btn-outline h-9 px-4 text-[11px]">Save note</button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold text-base pt-1" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
