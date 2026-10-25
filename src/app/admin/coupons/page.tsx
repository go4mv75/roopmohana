import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, formatDate } from "@/lib/format";
import { PageHeader, Panel, StatusBadge, Table } from "@/components/admin/ui";
import { CouponForm, CouponToggle } from "@/components/admin/forms";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons() {
  const db = await getDb();
  const coupons = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
  return (
    <>
      <PageHeader title="Coupons" sub="Saving an existing code updates it." />
      <Panel title="Create or update a coupon" className="mb-6">
        <CouponForm />
      </Panel>
      <Panel title="All coupons">
        <Table head={["Code", "Discount", "Conditions", "Used", "Expires", "Status", ""]}>
          {coupons.map((c) => (
            <tr key={c.code}>
              <td className="px-5 py-3 font-mono font-semibold">{c.code}</td>
              <td className="px-5 py-3">
                {c.kind === "percent" ? `${c.value}%` : money(c.value)}
                {c.maxDiscount != null && <span className="text-xs text-muted"> (max {money(c.maxDiscount)})</span>}
              </td>
              <td className="px-5 py-3 text-xs text-muted">
                {[c.minSubtotal ? `Min ${money(c.minSubtotal)}` : null, c.firstOrderOnly ? "First order" : null].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-5 py-3">{c.usedCount}{c.usageLimit != null ? ` / ${c.usageLimit}` : ""}</td>
              <td className="px-5 py-3 text-muted">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
              <td className="px-5 py-3"><StatusBadge value={c.active ? "paid" : "closed"} /></td>
              <td className="px-5 py-3"><CouponToggle code={c.code} active={c.active} /></td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
