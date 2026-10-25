import Link from "next/link";
import { getCategories, listProducts, type SortKey } from "@/lib/catalog";
import { ProductGrid } from "./product-card";
import { SortSelect } from "./sort-select";

const PAGE_SIZE = 24;
const PRICE_BANDS = [
  { key: "u2", label: "Under ₹2,000", min: undefined, max: 200000 },
  { key: "2-5", label: "₹2,000 – ₹5,000", min: 200000, max: 500000 },
  { key: "5-10", label: "₹5,000 – ₹10,000", min: 500000, max: 1000000 },
  { key: "10p", label: "Above ₹10,000", min: 1000000, max: undefined },
] as const;

export type ListingParams = { q?: string; sort?: string; price?: string; page?: string; stock?: string };

export async function Listing({
  basePath,
  category,
  params,
}: {
  basePath: string;
  category?: string;
  params: ListingParams;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const band = PRICE_BANDS.find((b) => b.key === params.price);
  const sort = (["featured", "newest", "price-asc", "price-desc"].includes(params.sort ?? "") ? params.sort : "featured") as SortKey;
  const q = params.q?.trim().slice(0, 80) || undefined;

  const [{ items, total }, categories] = await Promise.all([
    listProducts({
      category,
      q,
      sort,
      min: band?.min,
      max: band?.max,
      inStockOnly: params.stock === "1",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getCategories(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (patch: Partial<ListingParams>) => {
    const next = new URLSearchParams();
    const merged = { ...params, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    const s = next.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const filters = (
          <div className="space-y-8 pb-6 lg:pb-0">
            <FilterGroup title="Category">
              <FilterLink href={href({}).replace(basePath, "/shop")} active={!category}>
                All jewellery
              </FilterLink>
              {categories
                .filter((c) => c.count > 0)
                .map((c) => (
                  <FilterLink
                    key={c.slug}
                    href={(() => {
                      const u = href({});
                      return u.replace(basePath, `/collections/${c.slug}`);
                    })()}
                    active={category === c.slug}
                    count={c.count}
                  >
                    {c.name}
                  </FilterLink>
                ))}
            </FilterGroup>
            <FilterGroup title="Price">
              <FilterLink href={href({ price: undefined })} active={!band}>
                Any price
              </FilterLink>
              {PRICE_BANDS.map((b) => (
                <FilterLink key={b.key} href={href({ price: b.key })} active={band?.key === b.key}>
                  {b.label}
                </FilterLink>
              ))}
            </FilterGroup>
            <FilterGroup title="Availability">
              <FilterLink href={href({ stock: params.stock === "1" ? undefined : "1" })} active={params.stock === "1"}>
                In stock only
              </FilterLink>
            </FilterGroup>
          </div>
  );

  return (
    <div className="container-x grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-14 pt-10">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <details className="lg:hidden group border-y border-line">
          <summary className="flex justify-between items-center py-4 cursor-pointer list-none text-[12px] font-semibold tracking-[0.16em] uppercase">
            Filter
            <span className="group-open:rotate-45 transition-transform text-lg leading-none">+</span>
          </summary>
          {filters}
        </details>
        <div className="hidden lg:block">{filters}</div>
      </aside>

      <div>
        <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
          <p className="text-sm text-muted">
            {q ? (
              <>
                {total} result{total === 1 ? "" : "s"} for <b className="text-ink">“{q}”</b>{" "}
                <Link href={href({ q: undefined })} className="underline ml-1">
                  clear
                </Link>
              </>
            ) : (
              <>
                {total} piece{total === 1 ? "" : "s"}
              </>
            )}
          </p>
          <SortSelect value={sort} />
        </div>

        {items.length ? (
          <ProductGrid items={items} priorityCount={4} />
        ) : (
          <div className="py-24 text-center">
            <p className="display text-3xl">Nothing matches just yet</p>
            <p className="text-muted mt-3">Try a different filter, or ask us to make it for you.</p>
            <div className="flex gap-3 justify-center mt-8">
              <Link href="/shop" className="btn-outline">
                Clear filters
              </Link>
              <Link href="/customise" className="btn-primary">
                Customise
              </Link>
            </div>
          </div>
        )}

        {pages > 1 && (
          <nav className="flex justify-center gap-2 mt-16" aria-label="Pagination">
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={href({ page: n === 1 ? undefined : String(n) })}
                aria-current={n === page ? "page" : undefined}
                className={`w-10 h-10 grid place-items-center text-sm border ${n === page ? "bg-ink text-paper border-ink" : "border-line hover:border-ink"}`}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function FilterLink({ href, active, count, children }: { href: string; active?: boolean; count?: number; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className={`flex justify-between text-[15px] py-0.5 transition-colors ${active ? "text-sindoor font-semibold" : "text-ink-soft hover:text-ink"}`}
      >
        <span>{children}</span>
        {count != null && <span className="text-xs text-muted">{count}</span>}
      </Link>
    </li>
  );
}
