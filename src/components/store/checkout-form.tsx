"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CreditCard, Smartphone, QrCode, Banknote, Lock, Check } from "lucide-react";
import type { PaymentMethod } from "@/db/enums";
import type { Quote } from "@/lib/pricing";
import { money } from "@/lib/format";
import { INDIAN_STATES } from "@/lib/india";
import { getQuote, placeOrder, type PlaceOrderResult } from "@/app/(store)/checkout/actions";
import { useCart } from "./cart-store";
import { openRazorpay } from "./razorpay-checkout";

type Addr = { id?: number; name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };

const METHOD_INFO: Record<PaymentMethod, { title: string; sub: string; icon: React.ReactNode }> = {
  razorpay: { title: "Card, UPI, Netbanking & Wallets", sub: "Secured by Razorpay", icon: <CreditCard size={20} strokeWidth={1.4} /> },
  phonepe: { title: "Pay with any UPI app", sub: "Get a payment request on PhonePe, GPay, Paytm & more", icon: <Smartphone size={20} strokeWidth={1.4} /> },
  upi_direct: { title: "UPI — scan or tap to pay", sub: "Pay directly to our UPI ID, zero fees", icon: <QrCode size={20} strokeWidth={1.4} /> },
  cod: { title: "Cash on delivery", sub: "Pay when it arrives (extra COD fee)", icon: <Banknote size={20} strokeWidth={1.4} /> },
};

export function CheckoutForm({
  user,
  addresses,
  methods,
}: {
  user: { name: string; email: string; phone: string | null };
  addresses: Addr[];
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const [selected, setSelected] = useState<number | "new">(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<Addr>({
    name: user.name,
    phone: user.phone ?? "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "razorpay");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();

  const cart = useMemo(() => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), [lines]);
  const cartKey = JSON.stringify(cart);

  useEffect(() => {
    let alive = true;
    getQuote(JSON.parse(cartKey), coupon, method).then((q) => alive && setQuote(q));
    return () => {
      alive = false;
    };
  }, [cartKey, coupon, method]);

  // Pin a single PIN-code lookup to auto-fill city/state for new addresses.
  useEffect(() => {
    if (selected !== "new" || !/^[1-9]\d{5}$/.test(addr.pincode)) return;
    const ctrl = new AbortController();
    fetch(`https://api.postalpincode.in/pincode/${addr.pincode}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const po = d?.[0]?.PostOffice?.[0];
        if (po) setAddr((a) => ({ ...a, city: a.city || po.District, state: a.state || po.State }));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [addr.pincode, selected]);

  const shipTo = selected === "new" ? addr : addresses.find((a) => a.id === selected)!;

  async function handleStart(res: PlaceOrderResult) {
    if ("error" in res) {
      setError(res.error);
      return;
    }
    const { orderId, start } = res;
    if (start.kind === "razorpay" && res.razorpay) {
      clear();
      await openRazorpay(res.razorpay, orderId, router);
      return;
    }
    clear();
    if (start.kind === "redirect") {
      if (start.url.startsWith("/")) router.push(start.url);
      else window.location.href = start.url;
      return;
    }
    router.push(`/order/${orderId}?placed=1`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startPlacing(async () => {
      const res = await placeOrder({
        cart,
        couponCode: coupon,
        method,
        address: { ...shipTo, id: "" } as unknown as Record<string, string>,
        saveAddress: selected === "new" && saveAddress,
        notes,
      });
      await handleStart(res);
    });
  }

  if (!lines.length) {
    return (
      <div className="text-center py-20 card">
        <p className="display text-3xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );
  }

  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-14 items-start">
      <div className="space-y-12">
        {/* Contact */}
        <Step n={1} title="Contact">
          <p className="text-[15px]">
            {user.name} · <span className="text-muted">{user.email}</span>
          </p>
        </Step>

        {/* Address */}
        <Step n={2} title="Delivery address">
          {addresses.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {addresses.map((a) => (
                <RadioCard key={a.id} checked={selected === a.id} onSelect={() => setSelected(a.id!)}>
                  <p className="font-semibold text-sm">{a.name}</p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                    <br />
                    {a.phone}
                  </p>
                </RadioCard>
              ))}
              <RadioCard checked={selected === "new"} onSelect={() => setSelected("new")}>
                <p className="font-semibold text-sm">+ Add a new address</p>
              </RadioCard>
            </div>
          )}
          {selected === "new" && (
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Full name" className="sm:col-span-1">
                <input className="field" required value={addr.name} onChange={set("name")} autoComplete="name" />
              </Field>
              <Field label="Mobile number">
                <input className="field" required inputMode="numeric" value={addr.phone} onChange={set("phone")} autoComplete="tel-national" placeholder="10-digit" />
              </Field>
              <Field label="House no., building, street" className="sm:col-span-2">
                <input className="field" required value={addr.line1} onChange={set("line1")} autoComplete="address-line1" />
              </Field>
              <Field label="Area, landmark (optional)" className="sm:col-span-2">
                <input className="field" value={addr.line2} onChange={set("line2")} autoComplete="address-line2" />
              </Field>
              <Field label="PIN code">
                <input className="field" required inputMode="numeric" maxLength={6} value={addr.pincode} onChange={set("pincode")} autoComplete="postal-code" />
              </Field>
              <Field label="City">
                <input className="field" required value={addr.city} onChange={set("city")} autoComplete="address-level2" />
              </Field>
              <Field label="State" className="sm:col-span-2">
                <select className="field" required value={addr.state} onChange={set("state")} autoComplete="address-level1">
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <label className="sm:col-span-2 flex items-center gap-3 text-sm cursor-pointer">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-sindoor w-4 h-4" />
                Save this address for next time
              </label>
            </div>
          )}
        </Step>

        {/* Payment */}
        <Step n={3} title="Payment">
          {methods.length === 0 ? (
            <p className="text-sm text-sindoor">Online payments are being set up. Please contact us to place your order.</p>
          ) : (
            <div className="space-y-3">
              {methods.map((m) => (
                <RadioCard key={m} checked={method === m} onSelect={() => setMethod(m)}>
                  <div className="flex items-center gap-4">
                    <span className="text-sindoor">{METHOD_INFO[m].icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{METHOD_INFO[m].title}</p>
                      <p className="text-xs text-muted mt-0.5">{METHOD_INFO[m].sub}</p>
                    </div>
                  </div>
                </RadioCard>
              ))}
            </div>
          )}
          <Field label="Order notes (optional)" className="mt-8">
            <textarea className="field" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gift message, ring size, delivery instructions…" />
          </Field>
        </Step>
      </div>

      {/* Summary */}
      <aside className="card bg-ivory/50 p-6 sm:p-8 lg:sticky lg:top-28">
        <p className="eyebrow mb-6">Order summary</p>
        <ul className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.productId} className="flex gap-4 items-center">
              <div className="relative w-14 h-16 bg-sand shrink-0">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-paper text-[10px] grid place-items-center">{l.quantity}</span>
              </div>
              <p className="flex-1 text-sm leading-snug">{l.name}</p>
              <p className="text-sm font-semibold">{money(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
        {quote?.problems.map((p) => (
          <p key={p} className="text-xs text-sindoor mt-3">{p}</p>
        ))}

        <div className="flex gap-2 mt-6">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Discount code"
            className="field h-11 uppercase"
            aria-label="Discount code"
          />
          <button type="button" onClick={() => setCoupon(couponInput.trim() || null)} className="btn-outline h-11 px-5">
            Apply
          </button>
        </div>
        {coupon && quote?.couponMessage && (
          <p className={`text-xs mt-2 ${quote.couponCode ? "text-success" : "text-sindoor"}`}>
            {quote.couponCode && <Check size={12} className="inline mr-1" />}
            {quote.couponMessage}
          </p>
        )}

        <dl className="mt-6 space-y-2.5 text-[15px] border-t border-line pt-6">
          <Row label="Subtotal" value={quote ? money(quote.subtotal) : "—"} />
          {quote && quote.discount > 0 && <Row label={`Discount (${quote.couponCode})`} value={`− ${money(quote.discount)}`} accent />}
          <Row label={method === "cod" ? "Shipping + COD fee" : "Shipping"} value={quote ? (quote.shippingFee ? money(quote.shippingFee) : "Free") : "—"} />
        </dl>
        <div className="flex justify-between items-baseline border-t border-line mt-6 pt-6">
          <span className="eyebrow">Total</span>
          <span className="display text-3xl">{quote ? money(quote.total) : "—"}</span>
        </div>

        {error && (
          <p role="alert" className="text-sm text-sindoor bg-sindoor-soft px-4 py-3 mt-6">
            {error}
          </p>
        )}
        <button disabled={placing || !quote || !quote.lines.length || !methods.length} className="btn-accent w-full mt-6">
          <Lock size={14} />
          {placing ? "Please wait…" : method === "cod" ? "Place order" : `Pay ${quote ? money(quote.total) : ""}`}
        </button>
        <p className="text-[11px] text-muted text-center mt-3">Payments are encrypted and processed by RBI-regulated gateways.</p>
      </aside>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-4 mb-6">
        <span className="w-8 h-8 rounded-full border border-ink grid place-items-center text-sm display">{n}</span>
        <h2 className="display text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function RadioCard({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`w-full text-left p-4 border transition-colors flex gap-4 items-start ${checked ? "border-ink bg-paper" : "border-line hover:border-ink/40"}`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 grid place-items-center ${checked ? "border-sindoor" : "border-line"}`}>
        {checked && <span className="w-2 h-2 rounded-full bg-sindoor" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-success" : ""}`}>
      <dt className={accent ? "" : "text-ink-soft"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
