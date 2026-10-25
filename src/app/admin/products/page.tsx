import Image from "next/image";
import Link from "next/link";
import { and, asc, desc, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { getDb, schema } from "@/db";
import { money } from "@/lib/format";
import { PageHeader, Panel, Pager, Table } from "@/components/admin/ui";
import { ProductToggle } from "@/components/admin/product-toggle";

export const metadata = { title: "Products" };
const PAGE = 40;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; stock?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { products, categories } = schema;
  const where: SQL[] = [];
  if (sp.q) where.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`))!);
  if (sp.cat) where.push(eq(products.categoryId, Number(sp.cat)));
  if (sp.stock === "low") where.push(lte(products.stock, 2));

  const db = await getDb();
  const [rows, [{ total }], cats] = await Promise.all([
    db
      .select({ p: products, category: categories.name })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...where))
      .orderBy(sp.stock === "low" ? asc(products.stock) : desc(products.updatedAt))
      .limit(PAGE)
      .offset((page - 1) * PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(products).where(and(...where)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.cat) u.set("cat", sp.cat);
    if (sp.stock) u.set("stock", sp.stock);
    if (p > 1) u.set("page", String(p));
    return `/admin/products${u.size ? `?${u}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        sub={`${total} product${total === 1 ? "" : "s"}`}
        action={
          <Link href="/admin/products/new" className="btn-primary h-10 px-5">
            <Plus size={16} /> Add product
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name or SKU" className="field h-10 text-sm max-w-xs" />
        <select name="cat" defaultValue={sp.cat ?? ""} className="field h-10 text-sm max-w-[200px]">
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="stock" defaultValue={sp.stock ?? ""} className="field h-10 text-sm max-w-[160px]">
          <option value="">Any stock</option>
          <option value="low">Low / sold out</option>
        </select>
        <button className="btn-primary h-10 px-5">Filter</button>
      </form>
      <Panel>
        <Table head={["", "Product", "Category", "Price", "Stock", "Featured", "Visible"]}>
          {rows.map(({ p, category }) => (
            <tr key={p.id} className="hover:bg-ivory/70">
              <td className="pl-5 py-2 w-14">
                <div className="relative w-11 h-13 bg-sand">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="44px" className="object-cover" />}</div>
              </td>
              <td className="px-5 py-2">
                <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-sindoor">{p.name}</Link>
                {p.sku && <p className="text-xs text-muted">{p.sku}</p>}
              </td>
              <td className="px-5 py-2 text-muted">{category ?? "—"}</td>
              <td className="px-5 py-2 whitespace-nowrap">
                {money(p.price)}
                {p.compareAtPrice && <span className="text-xs text-muted line-through ml-1">{money(p.compareAtPrice)}</span>}
              </td>
              <td className={`px-5 py-2 font-semibold ${p.stock === 0 ? "text-sindoor" : p.stock <= 2 ? "text-warning" : ""}`}>{p.stock}</td>
              <td className="px-5 py-2"><ProductToggle id={p.id} field="featured" on={p.featured} /></td>
              <td className="px-5 py-2"><ProductToggle id={p.id} field="active" on={p.active} /></td>
            </tr>
          ))}
        </Table>
        <Pager page={page} pages={Math.ceil(total / PAGE)} href={qs} />
      </Panel>
    </>
  );
}
