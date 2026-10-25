"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="eyebrow">Sort</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(sp);
          next.delete("page");
          if (e.target.value === "featured") next.delete("sort");
          else next.set("sort", e.target.value);
          const s = next.toString();
          router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
        }}
        className="bg-transparent border-b border-line py-1.5 pr-6 outline-none focus:border-ink cursor-pointer"
      >
        <option value="featured">Featured</option>
        <option value="newest">Newest</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </label>
  );
}
