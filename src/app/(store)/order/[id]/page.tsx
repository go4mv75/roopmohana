import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { CheckCircle2, Clock, XCircle, Package, Truck, Home } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOwnedOrder } from "@/lib/order-access";
import { getOrderWithItems } from "@/lib/orders";
import { upiLink } from "@/lib/payments";
import { money, formatDateTime, paymentLabel, statusLabel } from "@/lib/format";
import { store, upi } from "@/lib/config";
import { PaymentWatcher, RetryPayment, UtrForm } from "@/components/store/order-client";

export const metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!(await getCurrentUser())) redirect(`/login?next=/order/${id}`);
  const owned = await getOwnedOrder(id);
  if (!owned) notFound();
  const { order, items } = (await getOrderWithItems(id))!;

  const paid = order.paymentStatus === "paid";
  const failed = order.paymentStatus === "failed";
  const waiting = order.status === "pending_payment" && !paid && !failed;
  const isUpiDirect = order.paymentMethod === "upi_direct";
  const qr = isUpiDirect && waiting ? await QRCode.toDataURL(upiLink(order), { margin: 1, width: 280, color: { dark: "#1d1a1f", light: "#fbf8f3" } }) : null;

  const steps = [
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "packed", label: "Packed", icon: Package },
    { key: "shipped", label: "Shipped", icon: Truck },
    { key: "delivered", label: "Delivered", icon: Home },
  ];
  const stepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <section className="container-x py-12 sm:py-16 max-w-5xl">
      {waiting && !isUpiDirect && <PaymentWatcher orderId={order.id} />}

      <div className="text-center mb-12">
        {paid || order.paymentMethod === "cod" ? (
          <>
            <CheckCircle2 size={44} strokeWidth={1.2} className="mx-auto text-success" />
            <h1 className="display text-4xl sm:text-5xl mt-4">{sp.placed ? "Thank you for your order" : `Order ${order.number}`}</h1>
            <p className="text-muted mt-3">
              {order.status === "cancelled" ? "This order was cancelled." : `Confirmation sent to ${order.email}. We dispatch within 1–3 business days.`}
            </p>
          </>
        ) : failed ? (
          <>
            <XCircle size={44} strokeWidth={1.2} className="mx-auto text-sindoor" />
            <h1 className="display text-4xl sm:text-5xl mt-4">Payment didn’t go through</h1>
            <p className="text-muted mt-3">No money was taken — or if it was, it’ll be refunded automatically by your bank. You can try again.</p>
            <div className="mt-6"><RetryPayment orderId={order.id} /></div>
          </>
        ) : order.status === "cancelled" ? (
          <>
            <XCircle size={44} strokeWidth={1.2} className="mx-auto text-muted" />
            <h1 className="display text-4xl sm:text-5xl mt-4">Order cancelled</h1>
          </>
        ) : isUpiDirect ? (
          <>
            <p className="eyebrow">Order {order.number}</p>
            <h1 className="display text-4xl sm:text-5xl mt-3">Complete your UPI payment</h1>
          </>
        ) : (
          <>
            <Clock size={44} strokeWidth={1.2} className="mx-auto text-warning animate-pulse" />
            <h1 className="display text-4xl sm:text-5xl mt-4">Waiting for payment…</h1>
            <p className="text-muted mt-3 max-w-md mx-auto">
              Approve the request in your UPI app or finish on the payment page. This page updates by itself the moment it’s done.
            </p>
            <div className="mt-6"><RetryPayment orderId={order.id} label="Open payment again" subtle /></div>
          </>
        )}
      </div>

      {isUpiDirect && waiting && qr && (
        <div className="card p-6 sm:p-10 mb-10 grid md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`UPI QR code to pay ${money(order.total)}`} width={240} height={240} className="mx-auto border border-line p-2 bg-paper" />
            <p className="text-xs text-muted mt-3">Scan with any UPI app</p>
          </div>
          <div className="space-y-5">
            <p className="display text-4xl">{money(order.total)}</p>
            <p className="text-sm text-ink-soft">
              Pay to <b>{upi.payeeName}</b> · <span className="font-mono">{upi.vpa}</span>
            </p>
            <a href={upiLink(order)} className="btn-accent w-full sm:w-auto md:hidden">Pay with UPI app</a>
            <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
              <li>Scan the QR (or tap the button on your phone) and pay the exact amount.</li>
              <li>Enter the 12-digit UTR / UPI reference from your app below.</li>
              <li>We verify and confirm your order — usually within a few hours.</li>
            </ol>
            {order.gatewayPaymentId ? (
              <p className="text-sm bg-ivory px-4 py-3">
                Reference <b className="font-mono">{order.gatewayPaymentId}</b> received — we’re verifying it. You’ll get an email once confirmed.
              </p>
            ) : (
              <UtrForm orderId={order.id} />
            )}
          </div>
        </div>
      )}

      {(paid || order.paymentMethod === "cod") && order.status !== "cancelled" && (
        <ol className="grid grid-cols-4 mb-12">
          {steps.map((s, i) => {
            const done = i <= stepIndex;
            return (
              <li key={s.key} className="flex flex-col items-center text-center relative">
                {i > 0 && <span className={`absolute right-1/2 top-5 h-px w-full ${done ? "bg-sindoor" : "bg-line"}`} />}
                <span className={`relative z-10 w-10 h-10 rounded-full grid place-items-center ${done ? "bg-sindoor text-paper" : "bg-paper border border-line text-muted"}`}>
                  <s.icon size={18} strokeWidth={1.5} />
                </span>
                <span className={`text-xs mt-2 ${done ? "font-semibold" : "text-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <div className="card p-5 mb-10 text-sm flex flex-wrap gap-x-8 gap-y-2">
          <span><span className="text-muted">Courier:</span> {order.trackingCarrier}</span>
          <span><span className="text-muted">Tracking no.:</span> <b className="font-mono">{order.trackingNumber}</b></span>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="card p-6 sm:p-8">
          <div className="flex justify-between items-baseline mb-6">
            <p className="eyebrow">Items</p>
            <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
          </div>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4 items-center">
                <div className="relative w-16 h-20 bg-sand shrink-0">{i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="flex-1">
                  <Link href={`/product/${i.slug}`} className="display text-xl hover:text-sindoor">{i.name}</Link>
                  <p className="text-sm text-muted">{money(i.unitPrice)} × {i.quantity}</p>
                </div>
                <p className="font-semibold">{money(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="border-t border-line pt-5 mt-2 space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success"><dt>Discount ({order.couponCode})</dt><dd>− {money(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd>{order.shippingFee ? money(order.shippingFee) : "Free"}</dd></div>
            <div className="flex justify-between text-lg font-semibold pt-2"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <p className="eyebrow mb-3">Status</p>
            <p className="font-semibold">{statusLabel[order.status]}</p>
            <p className="text-sm text-muted mt-1">{paymentLabel[order.paymentMethod]} · {order.paymentStatus}</p>
          </div>
          <div className="card p-6 text-sm leading-relaxed">
            <p className="eyebrow mb-3">Shipping to</p>
            <p className="font-semibold">{order.shippingAddress.name}</p>
            <p className="text-ink-soft">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
              <br />
              {order.shippingAddress.phone}
            </p>
          </div>
          <p className="text-xs text-muted">
            Questions? <a href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hi, about my order ${order.number}`)}`} className="underline">WhatsApp us</a> with your order number {order.number}.
          </p>
        </div>
      </div>
    </section>
  );
}
