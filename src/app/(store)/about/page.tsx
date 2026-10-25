import Image from "next/image";
import Link from "next/link";
import { getFeatured } from "@/lib/catalog";

export const metadata = {
  title: "Our story",
  description: "Roop Mohana makes timeless 925 sterling silver jewellery, ethically crafted in India for everyday elegance.",
};

export default async function AboutPage() {
  const imgs = (await getFeatured(4)).map((p) => p.image).filter(Boolean) as string[];
  return (
    <>
      <section className="bg-ivory">
        <div className="container-x py-20 lg:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="eyebrow">Our story</p>
            <h1 className="display text-5xl sm:text-7xl mt-5">
              <span className="font-[family-name:var(--font-deva)] text-sindoor text-4xl sm:text-5xl block mb-3">रूप मोहना</span>
              Beauty that enchants.
            </h1>
          </div>
          <div className="text-lg leading-relaxed text-ink-soft space-y-5">
            <p>
              <em>Roop</em> means form, beauty. <em>Mohana</em> — that which enchants. Our name is our promise: jewellery that
              doesn’t just look beautiful, but feels like it belongs to you.
            </p>
            <p>
              We work only in 925 sterling silver — the metal of heirlooms and everyday rituals in Indian homes. From delicate
              toe rings to Rajwadi earrings, every piece is ethically crafted in India by skilled artisans and checked by hand
              before it leaves us.
            </p>
          </div>
        </div>
      </section>

      <section className="container-x pt-24 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {imgs.map((src, i) => (
          <div key={src} className={`relative aspect-[3/4] bg-sand overflow-hidden ${i % 2 ? "lg:mt-16" : ""} ${i === 0 ? "arch" : ""}`}>
            <Image src={src} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
          </div>
        ))}
      </section>

      <section className="container-x pt-24 grid md:grid-cols-3 gap-12 max-w-6xl">
        {[
          ["Pure silver, always", "Every piece is 925 sterling silver — never brass, never silver-coated base metal."],
          ["Made by hand", "Filigree, oxidising, stone-setting and polishing — each step is done by skilled hands."],
          ["Made to last", "Designed for everyday luxury: comfortable to wear, easy to care for, built to be passed on."],
        ].map(([t, d]) => (
          <div key={t} className="border-t border-ink pt-6">
            <p className="display text-3xl">{t}</p>
            <p className="text-muted mt-3 leading-relaxed">{d}</p>
          </div>
        ))}
      </section>

      <section className="container-x pt-24 text-center">
        <h2 className="display text-4xl sm:text-5xl">Find a piece that feels like you</h2>
        <div className="flex gap-3 justify-center mt-8 flex-wrap">
          <Link href="/shop" className="btn-primary">Shop the collection</Link>
          <Link href="/customise" className="btn-outline">Customise</Link>
        </div>
      </section>
    </>
  );
}
