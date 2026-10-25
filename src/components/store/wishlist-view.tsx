"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProductCard } from "@/lib/catalog";
import { money } from "@/lib/format";
import { useCart } from "./cart-store";

export function WishlistView() {
  const { wishlist, toggleWish, add, setDrawerOpen } = useCart();
  const [items, setItems] = useState<ProductCard[] | null>(null);
  const key = wishlist.join(",");

  useEffect(() => {
    let alive = true;
    if (!key) {
      Promise.resolve().then(() => alive && setItems([]));
      return;
    }
    fetch(`/api/products?ids=${key}`)
      .then((r) => r.json())
      .then((rows: ProductCard[]) => {
        if (!alive) return;
        const order = key.split(",").map(Number);
        setItems(rows.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)));
      });
    return () => {
      alive = false;
    };
  }, [key]);

  if (items === null) return <div className="h-64" />;
  if (!items.length)
    return (
      <div className="text-center py-20">
        <p className="display text-3xl">Nothing saved yet</p>
        <p className="text-muted mt-3">Tap the heart on any piece to keep it here.</p>
        <Link href="/shop" className="btn-primary mt-8">Browse the collection</Link>
      </div>
    );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
      {items.map((p) => (
        <div key={p.id} className="group relative">
          <Link href={`/product/${p.slug}`} className="block relative aspect-[4/5] bg-sand overflow-hidden">
            {p.image && <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />}
          </Link>
          <button
            onClick={() => toggleWish(p.id)}
            className="absolute right-2 top-2 w-9 h-9 rounded-full bg-paper/90 grid place-items-center hover:text-sindoor"
            aria-label="Remove from wishlist"
          >
            <X size={16} />
          </button>
          <p className="display text-xl mt-4 leading-snug">{p.name}</p>
          <p className="text-sm font-semibold mt-1">{money(p.price)}</p>
          <button
            disabled={!p.inStock}
            onClick={() => {
              add({ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image });
              setDrawerOpen(true);
            }}
            className="btn-outline w-full mt-4 h-10 text-[11px]"
          >
            {p.inStock ? "Add to bag" : "Sold out"}
          </button>
        </div>
      ))}
    </div>
  );
}
