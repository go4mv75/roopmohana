"use client";

import { useActionState, useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { ORDER_STATUSES, type OrderStatus } from "@/db/enums";
import { statusLabel } from "@/lib/format";
import { confirmManualPayment, rejectManualPayment, updateOrderStatus } from "@/app/admin/actions";

const CARRIERS = ["Delhivery", "Blue Dart", "DTDC", "India Post (Speed Post)", "Ekart", "Xpressbees", "Shiprocket", "Other"];

export function OrderStatusForm({ orderId, status, carrier, tracking }: { orderId: string; status: OrderStatus; carrier: string; tracking: string }) {
  const [state, action, pending] = useActionState(updateOrderStatus.bind(null, orderId), undefined);
  const [next, setNext] = useState<OrderStatus>(status);
  return (
    <form action={action} className="space-y-4 text-sm">
      <label className="block">
        <span className="label">Status</span>
        <select name="status" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} className="field h-10">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </label>
      {(next === "shipped" || tracking) && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Courier</span>
            <input name="trackingCarrier" list="carriers" defaultValue={carrier} className="field h-10" />
            <datalist id="carriers">
              {CARRIERS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="label">Tracking no.</span>
            <input name="trackingNumber" defaultValue={tracking} className="field h-10 font-mono" />
          </label>
        </div>
      )}
      <label className="flex items-center gap-2">
        <input type="checkbox" name="notify" defaultChecked className="accent-sindoor" /> Email the customer about this change
      </label>
      {state?.error && <p className="text-sindoor text-xs">{state.error}</p>}
      {state?.ok && <p className="text-success text-xs">{state.ok}</p>}
      <button disabled={pending} className="btn-primary w-full h-10">{pending ? "Saving…" : "Update order"}</button>
    </form>
  );
}

export function ManualPaymentButtons({ orderId, canReject }: { orderId: string; canReject: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        disabled={pending}
        onClick={() => confirm("Confirm you have received this payment?") && start(() => confirmManualPayment(orderId))}
        className="btn-accent h-10 px-5 text-[11px]"
      >
        Payment received
      </button>
      {canReject && (
        <button
          disabled={pending}
          onClick={() => confirm("Mark this reference as not received? The customer can try again.") && start(() => rejectManualPayment(orderId))}
          className="btn-outline h-10 px-5 text-[11px]"
        >
          Not received
        </button>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-outline h-9 px-3 text-[11px]" aria-label="Print packing slip">
      <Printer size={14} /> Print
    </button>
  );
}
