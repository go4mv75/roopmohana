import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { money, formatDateTime, paymentLabel, statusLabel } from "@/lib/format";
import { PageHeader, Panel, Pager, StatusBadge, Table } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const PAGE = 30;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; verify?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { orders } = schema;
  const where: SQL[] = [];
  if (sp.status && ORDER_STATUSES.includes(sp.status as OrderStatus)) where.push(eq(orders.status, sp.status as OrderStatus));
  if (sp.verify) where.push(and(eq(orders.paymentMethod, "upi_direct"), eq(orders.paymentStatus, "pending"))!);
  if (sp.q) {
    const t = `%${sp.q.trim()}%`;
    where.push(or(ilike(orders.number, t), ilike(orders.email, t), ilike(orders.phone, t), sql`${orders.shippingAddress}->>'name' ilike ${t}`)!);
  }

  const db = await getDb();
  const [rows, [{ total }], counts] = await Promise.all([
    db.select().from(orders).where(and(...where)).orderBy(desc(orders.createdAt)).limit(PAGE).offset((page - 1) * PAGE),
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(and(...where)),
    db.select({ status: orders.status, n: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ status: sp.status, q: sp.q, verify: sp.verify, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader title="Orders" sub={`${total} order${total === 1 ? "" : "s"}`} />
      <div className="flex flex-wrap gap-2 mb-4">
        <Tab href={qs({ status: undefined, verify: undefined, page: undefined })} active={!sp.status && !sp.verify}>All</Tab>
        {ORDER_STATUSES.map((s) => (
          <Tab key={s} href={qs({ status: s, verify: undefined, page: undefined })} active={sp.status === s}>
            {statusLabel[s]} <span className="text-muted">{countOf(s)}</span>
          </Tab>
        ))}
        <Tab href={qs({ verify: "1", status: undefined, page: undefined })} active={!!sp.verify}>UPI to verify</Tab>
      </div>
      <form className="mb-4 flex gap-2 max-w-md">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Search order no., name, email, phone" className="field h-10 text-sm" />
        <button className="btn-primary h-10 px-5">Search</button>
      </form>
      <Panel>
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-muted text-center">No orders match.</p>
        ) : (
          <Table head={["Order", "Customer", "Placed", "Method", "Payment", "Status", "Total"]}>
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-ivory/70">
                <td className="px-5 py-3 font-mono font-semibold whitespace-nowrap">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-sindoor">{o.number}</Link>
                </td>
                <td className="px-5 py-3">
                  <p>{o.shippingAddress.name}</p>
                  <p className="text-xs text-muted">{o.shippingAddress.city}</p>
                </td>
                <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                <td className="px-5 py-3 text-xs">{paymentLabel[o.paymentMethod].split(" (")[0]}</td>
                <td className="px-5 py-3"><StatusBadge value={o.paymentStatus} /></td>
                <td className="px-5 py-3"><StatusBadge value={o.status} /></td>
                <td className="px-5 py-3 font-semibold text-right whitespace-nowrap">{money(o.total)}</td>
              </tr>
            ))}
          </Table>
        )}
        <Pager page={page} pages={Math.ceil(total / PAGE)} href={(p) => qs({ page: String(p) })} />
      </Panel>
    </>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`px-3 py-1.5 text-xs border whitespace-nowrap ${active ? "bg-ink text-paper border-ink" : "bg-paper border-line hover:border-ink"}`}>
      {children}
    </Link>
  );
}
