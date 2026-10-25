import Image from "next/image";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { money } from "@/lib/format";
import { WishButton } from "./wish-button";

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const off = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  return (
    <article className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          {p.image && (
            <Image
              src={p.image}
              alt={p.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className={`object-cover transition-[transform,opacity] duration-[1200ms] ease-[var(--ease-soft)] group-hover:scale-[1.04] ${p.hoverImage ? "group-hover:opacity-0" : ""}`}
            />
          )}
          {p.hoverImage && (
            <Image
              src={p.hoverImage}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {!p.inStock && <span className="bg-paper/95 text-ink text-[10px] font-bold tracking-[0.16em] uppercase px-2 py-1">Sold out</span>}
            {p.inStock && off > 0 && <span className="bg-sindoor text-paper text-[10px] font-bold tracking-[0.16em] uppercase px-2 py-1">−{off}%</span>}
          </div>
        </div>
        <div className="pt-4 pb-1 space-y-1">
          {p.category && <p className="eyebrow text-[10px]">{p.category}</p>}
          <h3 className="display text-[19px] sm:text-xl leading-snug group-hover:text-sindoor transition-colors line-clamp-2">{p.name}</h3>
          <p className="text-sm flex gap-2 items-baseline">
            <span className="font-semibold">{money(p.price)}</span>
            {p.compareAtPrice && <span className="text-muted line-through text-xs">{money(p.compareAtPrice)}</span>}
          </p>
        </div>
      </Link>
      <WishButton productId={p.id} className="absolute right-2 top-2" />
    </article>
  );
}

export function ProductGrid({ items, priorityCount = 0 }: { items: Card[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10 sm:gap-y-14">
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
