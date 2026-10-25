import { getCategories } from "@/lib/catalog";
import { getDb, schema } from "@/db";
import { PageHeader, Panel } from "@/components/admin/ui";
import { CategoryRow, NewCategoryForm } from "@/components/admin/forms";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  const db = await getDb();
  const [withCounts, all] = await Promise.all([getCategories(), db.select().from(schema.categories)]);
  const rows = all
    .map((c) => ({ ...c, count: withCounts.find((w) => w.id === c.id)?.count ?? 0 }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <>
      <PageHeader title="Categories" sub="Categories with no visible products are hidden from the store menu automatically." />
      <Panel title="Add a category" className="mb-6">
        <NewCategoryForm />
      </Panel>
      <Panel title="All categories">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_2fr_70px_auto] gap-2 px-5 pt-3 text-[11px] uppercase tracking-[0.12em] text-muted">
          <span>Name</span><span>URL</span><span>Description</span><span>Order</span><span />
        </div>
        <div className="divide-y divide-line">
          {rows.map((c) => (
            <CategoryRow key={c.id} c={c} />
          ))}
        </div>
      </Panel>
    </>
  );
}
