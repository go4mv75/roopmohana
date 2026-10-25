import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, formatDate } from "@/lib/format";
import { PageHeader, Panel, Table } from "@/components/admin/ui";

export const metadata = { title: "Customers" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { users, orders } = schema;
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
      orders: sql<number>`count(${orders.id}) filter (where ${orders.paymentStatus} = 'paid' or ${orders.paymentMethod} = 'cod')::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paid'),0)::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone, `%${q}%`)) : undefined)
    .groupBy(users.id)
    .orderBy(desc(sql`7`), desc(users.createdAt))
    .limit(200);
  const [{ subs }] = await db.select({ subs: sql<number>`count(*)::int` }).from(schema.subscribers);

  return (
    <>
      <PageHeader title="Customers" sub={`${rows.length} account${rows.length === 1 ? "" : "s"} · ${subs} newsletter subscriber${subs === 1 ? "" : "s"}`} />
      <form className="mb-4 flex gap-2 max-w-md">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="field h-10 text-sm" />
        <button className="btn-primary h-10 px-5">Search</button>
      </form>
      <Panel>
        <Table head={["Name", "Email", "Phone", "Joined", "Orders", "Spent"]}>
          {rows.map((u) => (
            <tr key={u.id}>
              <td className="px-5 py-3">
                {u.name} {u.role === "admin" && <span className="text-[10px] uppercase tracking-wider bg-ink text-paper px-1.5 py-0.5 ml-1">Owner</span>}
              </td>
              <td className="px-5 py-3"><a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a></td>
              <td className="px-5 py-3 text-muted">{u.phone ?? "—"}</td>
              <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDate(u.createdAt)}</td>
              <td className="px-5 py-3">{u.orders}</td>
              <td className="px-5 py-3 font-semibold">{money(u.spent)}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
