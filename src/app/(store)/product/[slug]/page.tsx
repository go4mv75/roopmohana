import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw, Gift } from "lucide-react";
import { getProduct, getRelated } from "@/lib/catalog";
import { money } from "@/lib/format";
import { shipping, siteUrl, store } from "@/lib/config";
import { ProductGrid } from "@/components/store/product-card";
import { Gallery } from "@/components/store/gallery";
import { BuyBox } from "@/components/store/buy-box";
import { WhatsAppIcon } from "@/components/store/brand-icons";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getProduct((await params).slug);
  if (!row) return {};
  const p = row.product;
  const desc = (p.shortDescription ?? p.description ?? "").split("\n")[0].slice(0, 160);
  return {
    title: p.name,
    description: desc,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: desc, images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const row = await getProduct(slug);
  if (!row) notFound();
  const { product: p, category } = row;
  const related = await getRelated(p.id, p.categoryId);
  const paragraphs = (p.description || p.shortDescription || "").split(/\n{2,}/).filter(Boolean);
  const short = (p.shortDescription ?? "").split(/\n{2,}/).filter(Boolean);
  const off = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => (i.startsWith("http") ? i : `${siteUrl()}${i}`)),
    description: paragraphs.join(" ").slice(0, 500),
    sku: p.sku ?? undefined,
    brand: { "@type": "Brand", name: store.name },
    material: p.material,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${siteUrl()}/product/${p.slug}`,
    },
  };

  const waText = encodeURIComponent(`Hi Roop Mohana, I'm interested in "${p.name}" (${siteUrl()}/product/${p.slug})`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x pt-6">
        <nav className="text-xs text-muted flex gap-2 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">Home</Link>/
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          {category && (
            <>
              /<Link href={`/collections/${category.slug}`} className="hover:text-ink">{category.name}</Link>
            </>
          )}
        </nav>
      </div>

      <section className="container-x grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 pt-6">
        <Gallery images={p.images} name={p.name} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          {category && <p className="eyebrow">{category.name}</p>}
          <h1 className="display text-4xl sm:text-5xl mt-3">{p.name}</h1>
          <div className="flex items-baseline gap-3 mt-5">
            <span className="text-2xl font-semibold">{money(p.price)}</span>
            {p.compareAtPrice && (
              <>
                <span className="text-muted line-through">{money(p.compareAtPrice)}</span>
                <span className="text-xs font-bold tracking-[0.12em] uppercase text-sindoor">Save {off}%</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted mt-1">Inclusive of all taxes</p>

          {short.length > 0 && (
            <div className="mt-6 text-[15px] text-ink-soft leading-relaxed space-y-2">
              {short.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </div>
          )}

          <div className="mt-8">
            <BuyBox
              product={{ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.images[0] ?? null }}
              stock={p.stock}
            />
          </div>

          <a
            href={`https://wa.me/${store.whatsapp}?text=${waText}`}
            target="_blank"
            rel="noopener"
            className="mt-4 flex items-center justify-center gap-2 text-[12px] font-semibold tracking-[0.12em] uppercase text-ink-soft hover:text-sindoor py-2"
          >
            <WhatsAppIcon size={16} /> Ask about this piece on WhatsApp
          </a>

          <ul className="grid grid-cols-2 gap-px bg-line border border-line mt-8 text-[13px]">
            <Perk icon={<ShieldCheck size={18} strokeWidth={1.4} />}>{p.material}</Perk>
            <Perk icon={<Truck size={18} strokeWidth={1.4} />}>Free shipping over {money(shipping.freeAbove)}</Perk>
            <Perk icon={<RotateCcw size={18} strokeWidth={1.4} />}>Easy returns on unused pieces</Perk>
            <Perk icon={<Gift size={18} strokeWidth={1.4} />}>Gift-ready packaging</Perk>
          </ul>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <Accordion title="Description" open>
              <div className="prose-rm">
                {paragraphs.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
                {p.sku && <p className="text-xs text-muted">SKU: {p.sku}</p>}
              </div>
            </Accordion>
            <Accordion title="Material & care">
              <div className="prose-rm">
                <p>
                  Crafted in {p.material}
                  {p.weightGrams ? `, approx. ${p.weightGrams} g` : ""}. Plated finishes (rose gold, gold tone) are decorative and
                  may soften with wear.
                </p>
                <p>
                  Silver naturally tarnishes over time. Store in the pouch provided, away from moisture, perfume and chemicals. A
                  soft silver-polishing cloth restores the shine.
                </p>
              </div>
            </Accordion>
            <Accordion title="Shipping & returns">
              <div className="prose-rm">
                <p>
                  Dispatched within 1–3 business days; delivered across India in 3–7 business days. Free shipping on prepaid orders
                  above {money(shipping.freeAbove)}.
                </p>
                <p>
                  Unused pieces in original packaging can be returned or exchanged. See our{" "}
                  <Link href="/policies/returns" className="underline">returns policy</Link>.
                </p>
              </div>
            </Accordion>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="container-x pt-28">
          <p className="eyebrow">You may also love</p>
          <h2 className="display text-4xl sm:text-5xl mt-3 mb-10">Complete the look</h2>
          <ProductGrid items={related} />
        </section>
      )}
    </>
  );
}

function Perk({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="bg-paper flex items-center gap-3 p-4">
      <span className="text-sindoor shrink-0">{icon}</span>
      {children}
    </li>
  );
}

function Accordion({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="group py-1" open={open}>
      <summary className="flex justify-between items-center py-4 cursor-pointer list-none text-[12px] font-semibold tracking-[0.16em] uppercase">
        {title}
        <span className="text-lg leading-none group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="pb-4 text-[15px]">{children}</div>
    </details>
  );
}
