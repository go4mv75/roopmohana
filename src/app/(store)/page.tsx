import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gem, Gift, ShieldCheck, Truck } from "lucide-react";
import { getCategories, getFeatured, getNewArrivals } from "@/lib/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { money } from "@/lib/format";
import { shipping, store } from "@/lib/config";

export default async function HomePage() {
  const [featured, newest, categories] = await Promise.all([getFeatured(8), getNewArrivals(8), getCategories()]);
  const cats = categories.filter((c) => c.count > 0);
  const heroImgs = featured.filter((p) => p.image).slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="container-x grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center py-14 sm:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="eyebrow rise">925 Sterling Silver · Handcrafted in India</p>
            <h1 className="display text-[52px] sm:text-[72px] lg:text-[88px] mt-6 rise rise-1">
              Silver that
              <br />
              <em className="text-sindoor">feels</em> like you.
            </h1>
            <p className="mt-7 text-[17px] leading-relaxed text-ink-soft max-w-md rise rise-2">
              Rings, payal, pendants and heirloom pieces in pure 925 silver — each one hand-finished and quality-checked before
              it reaches you.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 rise rise-3">
              <Link href="/shop" className="btn-primary">
                Shop the collection <ArrowRight size={16} />
              </Link>
              <Link href="/customise" className="btn-outline">
                Design your own
              </Link>
            </div>
          </div>

          <div className="relative h-[420px] sm:h-[520px] lg:h-[600px]">
            {heroImgs[0] && (
              <HeroArch className="absolute left-[18%] top-0 w-[54%] h-[86%] z-10" src={heroImgs[0].image!} alt={heroImgs[0].name} priority />
            )}
            {heroImgs[1] && <HeroArch className="absolute left-0 bottom-0 w-[36%] h-[52%] z-20 rise rise-2" src={heroImgs[1].image!} alt={heroImgs[1].name} />}
            {heroImgs[2] && <HeroArch className="absolute right-0 bottom-[8%] w-[34%] h-[48%] z-20 rise rise-3" src={heroImgs[2].image!} alt={heroImgs[2].name} />}
            <div aria-hidden className="absolute right-[6%] top-[4%] font-[family-name:var(--font-deva)] text-[120px] leading-none text-sindoor/[0.07] select-none">
              रूप
            </div>
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section className="border-y border-line bg-paper">
        <div className="container-x grid grid-cols-2 lg:grid-cols-4">
          {[
            [ShieldCheck, "Pure 925 sterling silver", "Quality-checked, piece by piece"],
            [Gem, "Handcrafted in India", "Ethically made by skilled artisans"],
            [Truck, `Free shipping over ${money(shipping.freeAbove)}`, "On prepaid orders, across India"],
            [Gift, "Gift-ready packaging", "Every order, at no extra cost"],
          ].map(([Icon, title, sub], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={i} className={`flex items-center gap-4 py-6 px-2 sm:px-6 ${i % 2 ? "" : "border-r border-line"} lg:border-r ${i === 3 ? "lg:border-r-0" : ""} ${i < 2 ? "border-b lg:border-b-0 border-line" : ""}`}>
                <I size={22} strokeWidth={1.3} className="text-sindoor shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">{title as string}</p>
                  <p className="text-xs text-muted hidden sm:block">{sub as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="container-x pt-24">
        <SectionHead eyebrow="Shop by piece" title="Find your forever piece" href="/shop" cta="View all" />
        <div className="flex gap-5 sm:gap-7 overflow-x-auto scrollbar-none snap-x pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {cats.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="group snap-start shrink-0 w-[150px] sm:w-[190px] text-center">
              <div className="relative aspect-[3/4] arch overflow-hidden bg-sand border border-line">
                {c.image && (
                  <Image src={c.image} alt={c.name} fill sizes="200px" className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-soft)] group-hover:scale-[1.06]" />
                )}
              </div>
              <p className="display text-xl mt-4 group-hover:text-sindoor">{c.name}</p>
              <p className="text-xs text-muted mt-0.5">{c.count} pieces</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-x pt-24">
        <SectionHead eyebrow="Most loved" title="Bestsellers" href="/shop" cta="Shop all" />
        <ProductGrid items={featured} />
      </section>

      {/* Editorial band */}
      <section className="mt-28 bg-sindoor-deep text-paper relative overflow-hidden">
        <div aria-hidden className="absolute -right-10 -bottom-16 font-[family-name:var(--font-deva)] text-[260px] leading-none text-paper/[0.04] select-none">
          मोहना
        </div>
        <div className="container-x py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center relative">
          <blockquote className="display text-4xl sm:text-5xl lg:text-6xl leading-[1.08]">
            “Jewellery is not just an accessory — <em className="text-[#e9c9c2]">it’s a feeling.</em>”
          </blockquote>
          <div className="lg:pl-12 lg:border-l border-paper/15 space-y-6">
            <p className="eyebrow text-paper/60">Made for you, by hand</p>
            <p className="text-lg leading-relaxed text-paper/80">
              Have a design in mind — a name pendant, bridal payal, or a ring you saw in your nani’s photographs? Share a
              sketch or a photo. Our artisans will craft it in pure 925 silver.
            </p>
            <Link href="/customise" className="btn bg-paper text-ink hover:bg-ivory">
              Start a custom piece <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x pt-24">
        <SectionHead eyebrow="Just in" title="New arrivals" href="/shop?sort=newest" cta="See what's new" />
        <ProductGrid items={newest} />
      </section>

      {/* Care */}
      <section className="container-x pt-28">
        <div className="grid lg:grid-cols-3 gap-px bg-line border border-line">
          {[
            ["01", "Wear it often", "Silver loves to be worn. Natural skin oils keep it bright — the more you wear it, the better it looks."],
            ["02", "Store it dry", "Keep each piece in its pouch, away from moisture. Airtight storage slows natural tarnishing."],
            ["03", "Last on, first off", "Put jewellery on after perfume and lotions, and take it off before bathing or swimming."],
          ].map(([n, t, d]) => (
            <div key={n} className="bg-paper p-8 lg:p-10">
              <p className="display text-5xl text-sindoor/30">{n}</p>
              <p className="display text-2xl mt-4">{t}</p>
              <p className="text-sm text-muted leading-relaxed mt-3">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social */}
      <section className="container-x pt-24 text-center">
        <p className="eyebrow">@roopmohana</p>
        <h2 className="display text-4xl sm:text-5xl mt-4">Worn by you</h2>
        <p className="text-muted mt-4 max-w-md mx-auto">Tag us on Instagram for a chance to be featured — and a little surprise in your next order.</p>
        <a href={store.instagram} target="_blank" rel="noopener" className="btn-outline mt-8">
          Follow on Instagram
        </a>
      </section>
    </>
  );
}

function HeroArch({ src, alt, className, priority }: { src: string; alt: string; className: string; priority?: boolean }) {
  return (
    <div className={`arch overflow-hidden bg-sand shadow-[0_30px_60px_-30px_rgba(29,26,31,0.45)] ring-1 ring-paper ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes="(min-width: 1024px) 30vw, 60vw" className="object-cover" />
    </div>
  );
}

function SectionHead({ eyebrow, title, href, cta }: { eyebrow: string; title: string; href: string; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-10">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display text-4xl sm:text-5xl mt-3">{title}</h2>
      </div>
      <Link href={href} className="shrink-0 text-[12px] font-semibold tracking-[0.16em] uppercase flex items-center gap-2 hover:text-sindoor pb-2">
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
