"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-store";
import { QtyStepper } from "./cart-drawer";
import { money } from "@/lib/format";

export function CartView({ freeShippingAbove }: { freeShippingAbove: number }) {
  const { lines, subtotal, setQty, remove } = useCart();

  if (!lines.length)
    return (
      <div className="text-center py-20">
        <p className="display text-3xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-8">Continue shopping</Link>
      </div>
    );

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-12">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <li key={l.productId} className="flex gap-5 py-6">
            <Link href={`/product/${l.slug}`} className="relative w-24 h-30 sm:w-28 sm:h-36 shrink-0 bg-sand overflow-hidden">
              {l.image && <Image src={l.image} alt={l.name} fill sizes="112px" className="object-cover" />}
            </Link>
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between gap-4">
                <Link href={`/product/${l.slug}`} className="display text-2xl leading-tight hover:text-sindoor">{l.name}</Link>
                <p className="font-semibold">{money(l.price * l.quantity)}</p>
              </div>
              <p className="text-sm text-muted mt-1">{money(l.price)} each</p>
              <div className="mt-auto flex items-center gap-6 pt-4">
                <QtyStepper value={l.quantity} onChange={(q) => setQty(l.productId, q)} />
                <button onClick={() => remove(l.productId)} className="text-xs uppercase tracking-[0.14em] text-muted hover:text-sindoor">
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <aside className="card p-8 h-fit lg:sticky lg:top-28 bg-ivory/50">
        <p className="eyebrow mb-6">Summary</p>
        <div className="flex justify-between text-[15px]">
          <span>Subtotal</span>
          <span className="font-semibold">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[15px] mt-3 text-muted">
          <span>Shipping</span>
          <span>{subtotal >= freeShippingAbove ? "Free (prepaid)" : "Calculated at checkout"}</span>
        </div>
        <p className="text-xs text-muted mt-6">Have a code like ROOP05? Apply it at checkout.</p>
        <Link href="/checkout" className="btn-accent w-full mt-6">Proceed to checkout</Link>
        <Link href="/shop" className="block text-center text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-sindoor mt-4">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
