import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getDb, schema } from "@/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const db = await getDb();
  const categories = await db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  const isNew = id === "new";
  let product = null;
  if (!isNew) {
    const n = Number(id);
    if (!Number.isInteger(n)) notFound();
    [product] = await db.select().from(schema.products).where(eq(schema.products.id, n));
    if (!product) notFound();
  }

  return (
    <>
      <Link href="/admin/products" className="text-xs flex items-center gap-1 text-muted hover:text-ink mb-4">
        <ArrowLeft size={14} /> All products
      </Link>
      <PageHeader
        title={product ? product.name : "New product"}
        action={
          product && (
            <Link href={`/product/${product.slug}`} target="_blank" className="text-xs flex items-center gap-1 underline">
              View in store <ExternalLink size={12} />
            </Link>
          )
        }
      />
      {saved && <p className="mb-6 bg-[#e3efe7] text-success text-sm px-4 py-3">Saved. Changes are live in the store.</p>}
      <ProductEditor
        key={product?.updatedAt.toString() ?? "new"}
        categories={categories}
        product={
          product && {
            id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku ?? "",
            categoryId: product.categoryId,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            stock: product.stock,
            material: product.material,
            weightGrams: product.weightGrams ?? "",
            shortDescription: product.shortDescription ?? "",
            description: product.description ?? "",
            images: product.images,
            featured: product.featured,
            active: product.active,
          }
        }
      />
    </>
  );
}
