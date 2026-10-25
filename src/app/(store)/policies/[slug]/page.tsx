import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POLICIES } from "@/lib/policies";
import { PageHero } from "@/components/store/page-hero";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = POLICIES[(await params).slug];
  return p ? { title: p.title, description: p.intro } : {};
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();
  return (
    <>
      <PageHero eyebrow="Policies" title={policy.title} description={policy.intro} />
      <div className="container-x grid lg:grid-cols-[220px_1fr] gap-12 pt-14 max-w-5xl">
        <nav className="flex lg:flex-col gap-4 flex-wrap text-sm">
          {Object.entries(POLICIES).map(([k, p]) => (
            <Link key={k} href={`/policies/${k}`} className={k === slug ? "text-sindoor font-semibold" : "text-ink-soft hover:text-ink"}>
              {p.title}
            </Link>
          ))}
        </nav>
        <div className="space-y-10">
          {policy.sections.map(([h, paras]) => (
            <section key={h}>
              <h2 className="display text-3xl mb-3">{h}</h2>
              {paras.length > 1 && slug === "returns" && h === "Not eligible" ? (
                <ul className="list-disc pl-5 space-y-1 text-ink-soft">
                  {paras.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              ) : (
                <div className="prose-rm">
                  {paras.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
