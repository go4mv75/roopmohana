import Link from "next/link";
import { statusLabel } from "@/lib/format";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="display text-4xl">{title}</h1>
        {sub && <p className="text-sm text-muted mt-1">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-paper border border-line ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[12px] font-semibold tracking-[0.14em] uppercase">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-[#f5ecd9] text-warning",
  confirmed: "bg-[#e3ecf5] text-[#2a4f73]",
  packed: "bg-[#ece6f3] text-[#5a3d7a]",
  shipped: "bg-[#e2eef0] text-[#225a63]",
  delivered: "bg-[#e3efe7] text-success",
  cancelled: "bg-sand text-muted",
  refunded: "bg-sand text-muted",
  paid: "bg-[#e3efe7] text-success",
  pending: "bg-[#f5ecd9] text-warning",
  unpaid: "bg-sand text-ink-soft",
  failed: "bg-sindoor-soft text-sindoor",
  new: "bg-sindoor-soft text-sindoor",
  in_progress: "bg-[#f5ecd9] text-warning",
  closed: "bg-sand text-muted",
  matched: "bg-[#e3efe7] text-success",
  unmatched: "bg-[#f5ecd9] text-warning",
  ambiguous: "bg-sindoor-soft text-sindoor",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap ${STATUS_STYLE[value] ?? "bg-sand"}`}>
      {statusLabel[value] ?? value.replace("_", " ")}
    </span>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] tracking-[0.12em] uppercase text-muted border-b border-line">
            {head.map((h) => (
              <th key={h} className="px-5 py-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-line text-sm">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="px-3 py-1.5 border border-line hover:border-ink">Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="px-3 py-1.5 border border-line hover:border-ink">Next</Link>}
      </div>
    </div>
  );
}
