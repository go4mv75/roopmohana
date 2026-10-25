"use client";

import { useActionState, useTransition } from "react";
import { deleteCategory, saveCategory, saveCoupon, setEnquiryStatus, toggleCoupon } from "@/app/admin/actions";

type Cat = { id: number; name: string; slug: string; description: string | null; sortOrder: number; count: number };

function Msg({ s }: { s?: { ok?: string; error?: string } }) {
  if (!s) return null;
  return <p className={`text-xs ${s.error ? "text-sindoor" : "text-success"}`}>{s.error ?? s.ok}</p>;
}

export function CategoryRow({ c }: { c: Cat }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  const [deleting, start] = useTransition();
  return (
    <form action={action} className="grid sm:grid-cols-[1fr_1fr_2fr_70px_auto] gap-2 items-center px-5 py-3">
      <input type="hidden" name="id" value={c.id} />
      <input name="name" defaultValue={c.name} className="field h-9 text-sm" aria-label="Name" />
      <input name="slug" defaultValue={c.slug} className="field h-9 text-sm font-mono" aria-label="URL slug" />
      <input name="description" defaultValue={c.description ?? ""} className="field h-9 text-sm" aria-label="Description" />
      <input name="sortOrder" type="number" defaultValue={c.sortOrder} className="field h-9 text-sm" aria-label="Order" />
      <div className="flex gap-2 items-center">
        <button disabled={pending} className="btn-outline h-9 px-3 text-[11px]">Save</button>
        <button
          type="button"
          disabled={deleting}
          onClick={() =>
            confirm(c.count ? `Delete “${c.name}”? Its ${c.count} products will become uncategorised.` : `Delete “${c.name}”?`) &&
            start(() => deleteCategory(c.id))
          }
          className="text-xs text-muted hover:text-sindoor"
        >
          Delete
        </button>
        <span className="text-xs text-muted whitespace-nowrap">{c.count} items</span>
      </div>
      <div className="sm:col-span-5"><Msg s={state} /></div>
    </form>
  );
}

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  return (
    <form action={action} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2 p-5">
      <input name="name" placeholder="Name, e.g. Nose Pins" required className="field h-10 text-sm" />
      <input name="description" placeholder="Short description (optional)" className="field h-10 text-sm" />
      <button disabled={pending} className="btn-primary h-10 px-5">Add</button>
      <div className="sm:col-span-3"><Msg s={state} /></div>
    </form>
  );
}

export function CouponForm() {
  const [state, action, pending] = useActionState(saveCoupon, undefined);
  return (
    <form action={action} className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
      <L label="Code"><input name="code" required placeholder="DIWALI10" className="field h-10 uppercase" /></L>
      <L label="Type">
        <select name="kind" className="field h-10">
          <option value="percent">Percent off</option>
          <option value="flat">Flat ₹ off</option>
        </select>
      </L>
      <L label="Value"><input name="value" required inputMode="decimal" placeholder="10" className="field h-10" /></L>
      <L label="Min. order (₹)"><input name="minSubtotal" inputMode="decimal" placeholder="0" className="field h-10" /></L>
      <L label="Max. discount (₹)"><input name="maxDiscount" inputMode="decimal" placeholder="No cap" className="field h-10" /></L>
      <L label="Usage limit"><input name="usageLimit" type="number" min={1} placeholder="Unlimited" className="field h-10" /></L>
      <L label="Expires on"><input name="expiresAt" type="date" className="field h-10" /></L>
      <L label="Shown to customer"><input name="description" placeholder="10% off for Diwali" className="field h-10" /></L>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="firstOrderOnly" className="accent-sindoor" /> First order only
      </label>
      <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-end gap-4">
        <Msg s={state} />
        <button disabled={pending} className="btn-primary h-10 px-6">Save coupon</button>
      </div>
    </form>
  );
}

export function CouponToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => start(() => toggleCoupon(code))} className="text-xs underline">
      {active ? "Disable" : "Enable"}
    </button>
  );
}

export function EnquiryStatus({ id, status }: { id: number; status: "new" | "in_progress" | "closed" }) {
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={status}
      onChange={(e) => start(() => setEnquiryStatus(id, e.target.value as typeof status))}
      className="field h-8 text-xs w-32"
      aria-label="Enquiry status"
    >
      <option value="new">New</option>
      <option value="in_progress">In progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
