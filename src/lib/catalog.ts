import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { products, categories } = schema;

export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  hoverImage: string | null;
  inStock: boolean;
  category: string | null;
};

const cardColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  images: products.images,
  stock: products.stock,
  category: categories.name,
};

type CardRow = { images: string[]; stock: number } & Omit<ProductCard, "image" | "hoverImage" | "inStock">;
const toCard = ({ images, stock, ...rest }: CardRow): ProductCard => ({
  ...rest,
  image: images[0] ?? null,
  hoverImage: images[1] ?? null,
  inStock: stock > 0,
});

export async function getCategories() {
  const db = await getDb();
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      image: categories.image,
      count: sql<number>`count(${products.id})::int`,
      fallbackImage: sql<string | null>`(array_agg(${products.images}->>0 order by ${products.featured} desc, ${products.id}))[1]`,
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.active, true)))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows.map(({ fallbackImage, ...c }) => ({ ...c, image: c.image ?? fallbackImage }));
}

export async function getCategory(slug: string) {
  const db = await getDb();
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug));
  return row ?? null;
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export async function listProducts(opts: {
  category?: string;
  q?: string;
  sort?: SortKey;
  min?: number;
  max?: number;
  inStockOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  const where: SQL[] = [eq(products.active, true)];
  if (opts.category) where.push(eq(categories.slug, opts.category));
  if (opts.q) {
    const term = `%${opts.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(products.name, term), ilike(products.description, term), ilike(categories.name, term))!);
  }
  if (opts.min != null) where.push(gte(products.price, opts.min));
  if (opts.max != null) where.push(lte(products.price, opts.max));
  if (opts.inStockOnly) where.push(sql`${products.stock} > 0`);

  const order =
    opts.sort === "price-asc"
      ? [asc(products.price)]
      : opts.sort === "price-desc"
        ? [desc(products.price)]
        : opts.sort === "newest"
          ? [desc(products.createdAt), desc(products.id)]
          : [desc(sql`${products.stock} > 0`), desc(products.featured), desc(products.id)];

  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...where))
    .orderBy(...order)
    .limit(opts.limit ?? 24)
    .offset(opts.offset ?? 0);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...where));

  return { items: rows.map(toCard), total };
}

export async function getFeatured(limit = 8) {
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), eq(products.featured, true)))
    .orderBy(desc(sql`${products.stock} > 0`), desc(products.id))
    .limit(limit);
  return rows.map(toCard);
}

export async function getNewArrivals(limit = 8) {
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), sql`${products.stock} > 0`))
    .orderBy(desc(products.createdAt), desc(products.id))
    .limit(limit);
  return rows.map(toCard);
}

export async function getProduct(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.active, true)));
  return row ?? null;
}

export async function getRelated(productId: number, categoryId: number | null, limit = 4) {
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.active, true),
        ne(products.id, productId),
        categoryId ? eq(products.categoryId, categoryId) : undefined,
      ),
    )
    .orderBy(desc(sql`${products.stock} > 0`), sql`random()`)
    .limit(limit);
  return rows.map(toCard);
}

export async function getCardsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select(cardColumns)
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.active, true), inArray(products.id, ids)));
  return rows.map(toCard);
}
