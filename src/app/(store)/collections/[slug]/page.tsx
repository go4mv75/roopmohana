import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/catalog";
import { Listing, type ListingParams } from "@/components/store/listing";
import { PageHero } from "@/components/store/page-hero";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<ListingParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  if (!c) return {};
  return { title: `Silver ${c.name}`, description: c.description ?? undefined };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  return (
    <>
      <PageHero eyebrow="Collection" title={category.name} description={category.description} />
      <Listing basePath={`/collections/${slug}`} category={slug} params={await searchParams} />
    </>
  );
}
