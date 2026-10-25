"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, X } from "lucide-react";
import { useCart } from "./cart-store";
import { money } from "@/lib/format";

export function CartDrawer({ freeShippingAbove }: { freeShippingAbove: number }) {
  const { lines, subtotal, drawerOpen, setDrawerOpen, setQty, remove } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  const remaining = Math.max(0, freeShippingAbove - subtotal);
  const pct = Math.min(100, (subtotal / freeShippingAbove) * 100);

  return (
    <div className={`fixed inset-0 z-[60] ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-500 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        role="dialog"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 h-full w-full max-w-[440px] bg-paper shadow-2xl flex flex-col transition-transform duration-500 ease-[var(--ease-soft)] ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-line">
          <p className="display text-2xl">Your bag</p>
          <button onClick={() => setDrawerOpen(false)} className="p-2 -mr-2 hover:text-sindoor" aria-label="Close bag">
            <X size={20} />
          </button>
        </div>

        {lines.length > 0 && (
          <div className="px-6 py-4 border-b border-line bg-ivory/60">
            <p className="text-[13px] text-ink-soft">
              {remaining > 0 ? (
                <>
                  You’re <b>{money(remaining)}</b> away from free shipping
                </>
              ) : (
                <>You’ve unlocked free shipping on prepaid orders ✦</>
              )}
            </p>
            <div className="mt-2 h-[3px] bg-line overflow-hidden">
              <div className="h-full bg-sindoor transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
              <p className="display text-3xl">Your bag is empty</p>
              <p className="text-muted text-sm max-w-[260px]">Every piece is handcrafted in 925 sterling silver.</p>
              <Link href="/shop" onClick={() => setDrawerOpen(false)} className="btn-primary mt-2">
                Explore the collection
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.productId} className="flex gap-4 py-5">
                  <Link
                    href={`/product/${l.slug}`}
                    onClick={() => setDrawerOpen(false)}
                    className="relative w-20 h-24 shrink-0 bg-sand overflow-hidden"
                  >
                    {l.image && <Image src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <Link
                        href={`/product/${l.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="display text-lg leading-tight hover:text-sindoor"
                      >
                        {l.name}
                      </Link>
                      <button onClick={() => remove(l.productId)} className="text-muted hover:text-sindoor h-fit" aria-label={`Remove ${l.name}`}>
                        <X size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-muted mt-1">{money(l.price)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <QtyStepper value={l.quantity} onChange={(q) => setQty(l.productId, q)} />
                      <p className="text-sm font-semibold">{money(l.price * l.quantity)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-line px-6 py-5 space-y-4 bg-paper">
            <div className="flex justify-between items-baseline">
              <span className="eyebrow">Subtotal</span>
              <span className="display text-2xl">{money(subtotal)}</span>
            </div>
            <p className="text-xs text-muted">Shipping and discounts are calculated at checkout.</p>
            <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="btn-accent w-full">
              Checkout securely
            </Link>
            <Link href="/cart" onClick={() => setDrawerOpen(false)} className="block text-center text-xs tracking-[0.14em] uppercase text-ink-soft hover:text-sindoor">
              View bag
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export function QtyStepper({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="inline-flex items-center border border-line h-9">
      <button type="button" className="w-9 h-full grid place-items-center hover:text-sindoor" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <Minus size={14} />
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="w-9 h-full grid place-items-center hover:text-sindoor disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
