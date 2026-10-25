/**
 * Seeds categories, the existing roopmohana.com catalogue, the ROOP05 coupon
 * and the owner account. Safe to re-run: existing rows are left untouched.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run db:seed
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";

const CATEGORIES: { slug: string; name: string; description: string }[] = [
  { slug: "rings", name: "Rings", description: "Solitaires, statement cocktail rings and everyday bands in 925 silver." },
  { slug: "pendants", name: "Pendants", description: "Delicate drops and heirloom-worthy centrepieces." },
  { slug: "earrings", name: "Earrings", description: "From quiet studs to Rajwadi chandbalis." },
  { slug: "necklaces", name: "Necklaces", description: "Layered chains and occasion necklaces." },
  { slug: "bracelets", name: "Bracelets", description: "Oxidised florals, polished waves and fine links." },
  { slug: "anklets", name: "Anklets (Payal)", description: "Payal that sings softly with every step." },
  { slug: "toe-rings", name: "Toe Rings", description: "Bichiya, handcrafted and adjustable." },
  { slug: "kada", name: "Kada", description: "Bold, weighty silver kadas." },
  { slug: "bangles", name: "Bangles", description: "Silver bangles for every wrist." },
  { slug: "nose-pins", name: "Nose Pins", description: "Tiny sparkles, big presence." },
  { slug: "mangalsutra", name: "Mangalsutra", description: "Modern mangalsutras in sterling silver." },
];

type CatalogItem = {
  name: string;
  slug: string;
  sku: string | null;
  category: string;
  price: number;
  compareAtPrice: number | null;
  description: string;
  shortDescription: string;
  images: string[];
  inStock: boolean;
  featured: boolean;
};

async function main() {
  const db = await createDb();

  for (const [i, c] of CATEGORIES.entries()) {
    await db
      .insert(schema.categories)
      .values({ ...c, sortOrder: i })
      .onConflictDoNothing({ target: schema.categories.slug });
  }
  const cats = await db.select().from(schema.categories);
  const catId = (slug: string) => cats.find((c) => c.slug === slug)?.id ?? null;

  const catalog: CatalogItem[] = JSON.parse(readFileSync(path.join(process.cwd(), "data", "catalog.json"), "utf8"));
  // Older items first so "newest" sorting matches the original store.
  let inserted = 0;
  for (const [i, p] of [...catalog].reverse().entries()) {
    const res = await db
      .insert(schema.products)
      .values({
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        categoryId: catId(p.category),
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        description: p.description,
        shortDescription: p.shortDescription,
        images: p.images,
        // The old store didn't track quantities; start in-stock items at 5. Adjust in the dashboard.
        stock: p.inStock ? 5 : 0,
        featured: p.featured,
        createdAt: new Date(Date.now() - (catalog.length - i) * 3600_000),
      })
      .onConflictDoNothing({ target: schema.products.slug })
      .returning({ id: schema.products.id });
    inserted += res.length;
  }

  await db
    .insert(schema.coupons)
    .values({
      code: "ROOP05",
      description: "5% off your first order",
      kind: "percent",
      value: 5,
      firstOrderOnly: true,
    })
    .onConflictDoNothing();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters");
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    const passwordHash = await bcrypt.hash(password, 12);
    if (existing) {
      await db
        .update(schema.users)
        .set({ role: "admin", passwordHash, sessionVersion: existing.sessionVersion + 1 })
        .where(eq(schema.users.id, existing.id));
      console.log(`Owner account updated: ${email}`);
    } else {
      await db.insert(schema.users).values({ id: nanoid(), email, name: "Store Owner", role: "admin", passwordHash });
      console.log(`Owner account created: ${email}`);
    }
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped owner account.");
  }

  console.log(`Seed complete. ${inserted} new products, ${cats.length} categories.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
