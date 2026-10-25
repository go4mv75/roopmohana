import type { Metadata } from "next";
import { Listing, type ListingParams } from "@/components/store/listing";
import { PageHero } from "@/components/store/page-hero";

export const metadata: Metadata = {
  title: "Shop all silver jewellery",
  description: "Browse handcrafted 925 sterling silver rings, pendants, earrings, bracelets, anklets and more.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<ListingParams> }) {
  const params = await searchParams;
  return (
    <>
      <PageHero eyebrow="The collection" title={params.q ? "Search" : "All jewellery"} />
      <Listing basePath="/shop" params={params} />
    </>
  );
}
