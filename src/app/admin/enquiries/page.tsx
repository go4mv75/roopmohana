import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Panel } from "@/components/admin/ui";
import { EnquiryStatus } from "@/components/admin/forms";

export const metadata = { title: "Enquiries" };

export default async function AdminEnquiries() {
  const db = await getDb();
  const rows = await db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(200);
  return (
    <>
      <PageHeader title="Enquiries" sub="Contact-form messages and customisation requests." />
      {rows.length === 0 ? (
        <Panel><p className="p-8 text-sm text-muted text-center">No enquiries yet.</p></Panel>
      ) : (
        <div className="space-y-4">
          {rows.map((e) => (
            <Panel key={e.id}>
              <div className="p-5 grid md:grid-cols-[1fr_auto] gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 ${e.kind === "customization" ? "bg-sindoor text-paper" : "bg-sand"}`}>
                      {e.kind === "customization" ? "Custom piece" : "Contact"}
                    </span>
                    <b>{e.name}</b>
                    {e.email && <a href={`mailto:${e.email}`} className="text-sm underline">{e.email}</a>}
                    {e.phone && (
                      <a href={`https://wa.me/${e.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} className="text-sm underline">
                        {e.phone}
                      </a>
                    )}
                    <span className="text-xs text-muted">{formatDateTime(e.createdAt)}</span>
                  </div>
                  {e.budget && <p className="text-xs text-muted mt-2">Budget: {e.budget}</p>}
                  <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{e.message}</p>
                </div>
                <EnquiryStatus id={e.id} status={e.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
