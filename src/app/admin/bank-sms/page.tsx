import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { money, formatDateTime } from "@/lib/format";
import { upi } from "@/lib/config";
import { PageHeader, Panel, StatusBadge, Table } from "@/components/admin/ui";

export const metadata = { title: "Bank SMS" };

export default async function BankSmsPage() {
  const db = await getDb();
  const rows = await db
    .select({ c: schema.bankCredits, orderNumber: schema.orders.number })
    .from(schema.bankCredits)
    .leftJoin(schema.orders, eq(schema.bankCredits.orderId, schema.orders.id))
    .orderBy(desc(schema.bankCredits.receivedAt))
    .limit(200);
  const last = rows[0]?.c.receivedAt;

  return (
    <>
      <PageHeader
        title="Bank SMS"
        sub={
          upi.autoVerify
            ? last
              ? `Last credit SMS received ${formatDateTime(last)}`
              : "Waiting for the first forwarded SMS"
            : process.env.SMS_WEBHOOK_SECRET
              ? "Not active — SMS_WEBHOOK_SECRET must be at least 16 characters, so forwarded SMS are being refused"
              : "Not set up — add SMS_WEBHOOK_SECRET and the phone forwarder (see README)"
        }
      />
      <Panel>
        {rows.length === 0 ? (
          <p className="p-8 text-sm text-muted text-center">
            No credits yet. Each UPI credit SMS your phone forwards appears here and is matched to the waiting order with the same amount.
          </p>
        ) : (
          <Table head={["Received", "Amount", "UPI ref", "From", "Result", "Order"]}>
            {rows.map(({ c, orderNumber }) => (
              <tr key={c.id} title={c.rawText}>
                <td className="px-5 py-3 text-muted whitespace-nowrap">{formatDateTime(c.receivedAt)}</td>
                <td className="px-5 py-3 font-semibold">{money(c.amount)}</td>
                <td className="px-5 py-3 font-mono">{c.utr}</td>
                <td className="px-5 py-3 text-xs">{c.payer ?? "—"}</td>
                <td className="px-5 py-3"><StatusBadge value={c.status} /></td>
                <td className="px-5 py-3">
                  {c.orderId ? (
                    <Link href={`/admin/orders/${c.orderId}`} className="font-mono underline whitespace-nowrap">{orderNumber}</Link>
                  ) : (
                    <span className="text-xs text-muted">{c.status === "ambiguous" ? "Several orders — confirm by hand" : "No waiting order with this amount"}</span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </>
  );
}
