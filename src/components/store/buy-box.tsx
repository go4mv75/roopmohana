"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CartLine } from "./cart-store";
import { QtyStepper } from "./cart-drawer";
import { WishButton } from "./wish-button";

export function BuyBox({ product, stock }: { product: Omit<CartLine, "quantity">; stock: number }) {
  const { add, setDrawerOpen } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const max = Math.min(10, stock);

  if (stock <= 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-sindoor font-semibold">This piece is currently sold out.</p>
        <Link href="/customise" className="btn-outline w-full">
          Request it made-to-order
        </Link>
        <WishButton productId={product.productId} withLabel />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(max, v)))} max={max} />
        {stock <= 3 && <p className="text-xs font-semibold text-sindoor">Only {stock} left</p>}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <button
          className="btn-primary"
          onClick={() => {
            add(product, qty);
            setDrawerOpen(true);
          }}
        >
          Add to bag
        </button>
        <WishButton productId={product.productId} className="!w-12 !h-12 !rounded-none border border-line" />
      </div>
      <button
        className="btn-accent w-full"
        onClick={() => {
          add(product, qty);
          router.push("/checkout");
        }}
      >
        Buy it now
      </button>
    </div>
  );
}
