import Link from "next/link";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getDb, schema } from "@/db";
import { money, formatDateTime } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Table } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { payments } from "@/lib/config";

const { orders, products, enquiries } = schema;

export default async function AdminHome() {
  const db = await getDb();
  const now = new Date();
  // Midnight in India (UTC+5:30), expressed as a UTC instant.
  const IST = 330 * 60_000;
  const dayStart = new Date(Math.floor((now.getTime() + IST) / 86400_000) * 86400_000 - IST);
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const d7 = new Date(now.getTime() - 7 * 86400_000);

  const paidish = sql`(${orders.paymentStatus} = 'paid' or (${orders.paymentMethod} = 'cod' and ${orders.status} <> 'cancelled'))`;
  const sumSince = (since: Date) =>
    db
      .select({ revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(paidish, gte(orders.createdAt, since)));

  const [[today], [week], [month], [toFulfil], [awaitingUpi], lowStock, recent, daily, [newEnquiries]] = await Promise.all([
    sumSince(dayStart),
    sumSince(d7),
    sumSince(d30),
    db.select({ n: sql<number>`count(*)::int` }).from(orders).where(inArray(orders.status, ["confirmed", "packed"])),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.paymentMethod, "upi_direct"), eq(orders.paymentStatus, "pending"), sql`${orders.gatewayPaymentId} is not null`)),
    db
      .select({ id: products.id, name: products.name, stock: products.stock })
      .from(products)
      .where(and(eq(products.active, true), lte(products.stock, 2)))
      .orderBy(products.stock)
      .limit(8),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db
      .select({
        day: sql<string>`to_char(${orders.createdAt} at time zone 'Asia/Kolkata', 'YYYY-MM-DD')`,
        revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(paidish, gte(orders.createdAt, d30)))
      .groupBy(sql`1`),
    db.select({ n: sql<number>`count(*)::int` }).from(enquiries).where(eq(enquiries.status, "new")),
  ]);

  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 86400_000);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const row = daily.find((r) => r.day === key);
    return { day: key, revenue: row?.revenue ?? 0, count: row?.count ?? 0 };
  });

  const noPayments = !payments.razorpay && !payments.phonepe && !payments.upiDirect && !payments.cod;

  return (
    <>
      <PageHeader title="Overview" sub={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })} />

      {(noPayments || payments.mock) && (
        <div className="mb-6 flex gap-3 items-start bg-[#f5ecd9] text-warning px-4 py-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            {payments.mock
              ? "Test mode: payments are simulated (PAYMENTS_MOCK=true). Real gateways are not being charged."
              : "No payment method is configured yet. Add Razorpay or PhonePe keys (see README) before going live."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Kpi label="Today" value={money(today.revenue)} sub={`${today.count} order${today.count === 1 ? "" : "s"}`} />
        <Kpi label="Last 7 days" value={money(week.revenue)} sub={`${week.count} order${week.count === 1 ? "" : "s"}`} />
        <Kpi label="Last 30 days" value={money(month.revenue)} sub={month.count ? `Avg ${money(Math.round(month.revenue / month.count))}` : "—"} />
        <Kpi
          label="To fulfil"
          value={String(toFulfil.n)}
          sub={awaitingUpi.n ? `${awaitingUpi.n} UPI payment${awaitingUpi.n > 1 ? "s" : ""} to verify` : "orders confirmed / packed"}
          href="/admin/orders?status=confirmed"
          alert={awaitingUpi.n > 0}
        />
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-6">
        <Panel title="Revenue · last 30 days">
          <div className="p-5">
            <RevenueChart data={series} />
          </div>
        </Panel>
        <div className="space-y-6">
          <Panel title="Low stock" action={<Link href="/admin/products?stock=low" className="text-xs underline">All</Link>}>
            {lowStock.length === 0 ? (
              <p className="p-5 text-sm text-muted">Everything is well stocked.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/products/${p.id}`} className="flex justify-between gap-4 px-5 py-3 text-sm hover:bg-ivory">
                      <span className="truncate">{p.name}</span>
                      <span className={`shrink-0 font-semibold ${p.stock === 0 ? "text-sindoor" : "text-warning"}`}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {newEnquiries.n > 0 && (
            <Link href="/admin/enquiries" className="flex items-center justify-between bg-sindoor text-paper px-5 py-4 text-sm">
              {newEnquiries.n} new enquir{newEnquiries.n === 1 ? "y" : "ies"} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>

      <Panel title="Recent orders" className="mt-6" action={<Link href="/admin/orders" className="text-xs underline">View all</Link>}>
        {recent.length === 0 ? (
          <p className="p-5 text-sm text-muted">No orders yet. They’ll appear here the moment a customer checks out.</p>
        ) : (
          <Table head={["Order", "Customer", "Placed", "Payment", "Status", "Total"]}>
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-ivory/70">
                <td className="px-5 py-3 font-mono font-semibold">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-sindoor">{o.number}</Link>
                </td>
                <td className="px-5 py-3">{o.shippingAddress.name}</td>
                <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                <td className="px-5 py-3"><StatusBadge value={o.paymentStatus} /></td>
                <td className="px-5 py-3"><StatusBadge value={o.status} /></td>
                <td className="px-5 py-3 font-semibold text-right">{money(o.total)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}

function Kpi({ label, value, sub, href, alert }: { label: string; value: string; sub: string; href?: string; alert?: boolean }) {
  const body = (
    <div className={`bg-paper border p-5 h-full ${alert ? "border-sindoor" : "border-line"}`}>
      <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">{label}</p>
      <p className="display text-4xl mt-2 [font-variant-numeric:lining-nums_tabular-nums]">{value}</p>
      <p className={`text-xs mt-1 ${alert ? "text-sindoor font-semibold" : "text-muted"}`}>{sub}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
