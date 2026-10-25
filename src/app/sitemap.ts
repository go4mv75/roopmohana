import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { siteUrl } from "@/lib/config";
import { POLICIES } from "@/lib/policies";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const db = await getDb();
  const [products, categories] = await Promise.all([
    db.select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt }).from(schema.products).where(eq(schema.products.active, true)),
    db.select({ slug: schema.categories.slug }).from(schema.categories),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...["about", "customise", "contact"].map((p) => ({ url: `${base}/${p}` })),
    ...Object.keys(POLICIES).map((p) => ({ url: `${base}/policies/${p}` })),
    ...categories.map((c) => ({ url: `${base}/collections/${c.slug}`, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
  ];
}
