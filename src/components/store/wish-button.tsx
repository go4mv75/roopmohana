"use client";

import { Heart } from "lucide-react";
import { useCart } from "./cart-store";

export function WishButton({ productId, className = "", withLabel = false }: { productId: number; className?: string; withLabel?: boolean }) {
  const { wishlist, toggleWish } = useCart();
  const on = wishlist.includes(productId);
  return (
    <button
      type="button"
      onClick={() => toggleWish(productId)}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      className={
        withLabel
          ? `btn-outline w-full ${className}`
          : `w-9 h-9 grid place-items-center rounded-full bg-paper/85 backdrop-blur hover:bg-paper transition ${className}`
      }
    >
      <Heart size={withLabel ? 16 : 16} strokeWidth={1.6} className={on ? "fill-sindoor text-sindoor" : ""} />
      {withLabel && (on ? "Saved" : "Save to wishlist")}
    </button>
  );
}
