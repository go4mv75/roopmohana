import "server-only";
import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addOrderEvent, markOrderPaid, UPI_MATCH_WINDOW_MS } from "../orders";
import { money } from "../format";

/**
 * Automatic verification for direct-UPI payments, without a gateway:
 * the owner's Android phone forwards bank "money received" SMS to
 * /api/webhooks/bank-sms, and each credit is matched to the waiting
 * order with exactly that amount (orders get unique amounts via upiOffset).
 */

export type ParsedCredit = { amount: number; utr: string; payer: string | null };

const CREDIT = /\b(credited|received|deposited)\b/i;
const DEBIT = /\b(debited|spent|withdrawn|sent\s+(?:rs|inr|₹))/i;
const AMOUNT = /(?:INR|Rs\.?|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
// UTR / RRN after a label ("UPI Ref No 4123…", "(UPI 4123…)", "RRN: 4123…")
const LABELLED_UTR = /(?:UPI(?:\s*Ref(?:erence)?)?(?:\s*No\.?)?|Ref(?:erence)?(?:\s*No\.?)?|RRN|UTR)[\s:.#-]*\(?\s*(\d{12})\b/i;
const ANY_12_DIGITS = /(?<![\dXx*])(\d{12})(?!\d)/;
const VPA = /\b([a-z0-9._-]{2,}@[a-z][a-z0-9.]{1,})\b/i;

/** Pulls amount, UTR and payer out of a bank credit SMS. Returns null for anything else. */
export function parseBankSms(text: string): ParsedCredit | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!CREDIT.test(t) || DEBIT.test(t)) return null;
  const a = AMOUNT.exec(t);
  const u = LABELLED_UTR.exec(t) ?? ANY_12_DIGITS.exec(t);
  if (!a || !u) return null;
  const amount = Math.round(Number(a[1].replace(/,/g, "")) * 100);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, utr: u[1], payer: VPA.exec(t)?.[1] ?? null };
}

/** Sender IDs allowed to count as bank alerts, e.g. "VM-HDFCBK". Substring match. */
export function isAllowedSender(from: string) {
  const allowed = (process.env.SMS_ALLOWED_SENDERS ?? "HDFCBK")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const f = from.toUpperCase();
  return allowed.some((a) => f.includes(a));
}

export type SmsResult =
  | { result: "ignored"; reason: string }
  | { result: "duplicate"; utr: string }
  | { result: "matched"; utr: string; order: string }
  | { result: "unmatched" | "ambiguous"; utr: string; amount: number };

export async function processBankSms(from: string, text: string): Promise<SmsResult> {
  if (!isAllowedSender(from)) return { result: "ignored", reason: "sender not allowed" };
  const credit = parseBankSms(text);
  if (!credit) return { result: "ignored", reason: "not a credit alert" };

  const db = await getDb();
  const [row] = await db
    .insert(schema.bankCredits)
    .values({ ...credit, sender: from.slice(0, 40), rawText: text.slice(0, 1000), status: "unmatched" })
    .onConflictDoNothing({ target: schema.bankCredits.utr })
    .returning({ id: schema.bankCredits.id });
  if (!row) return { result: "duplicate", utr: credit.utr };

  const candidates = await db
    .select({ id: schema.orders.id, number: schema.orders.number, gatewayPaymentId: schema.orders.gatewayPaymentId })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.paymentMethod, "upi_direct"),
        eq(schema.orders.status, "pending_payment"),
        inArray(schema.orders.paymentStatus, ["pending", "failed"]),
        eq(schema.orders.total, credit.amount),
        gte(schema.orders.createdAt, new Date(Date.now() - UPI_MATCH_WINDOW_MS)),
      ),
    );
  // If the customer already typed this UTR on an order, that settles any tie.
  const byUtr = candidates.filter((c) => c.gatewayPaymentId === credit.utr);
  const pick = byUtr.length === 1 ? byUtr : candidates;

  if (pick.length !== 1) {
    const status = pick.length === 0 ? "unmatched" : "ambiguous";
    await db.update(schema.bankCredits).set({ status }).where(eq(schema.bankCredits.id, row.id));
    for (const c of pick) {
      await addOrderEvent(c.id, "bank_sms_ambiguous", `Bank SMS ${money(credit.amount)} (UPI ${credit.utr}) matches several orders — confirm by hand`);
    }
    return { result: status, utr: credit.utr, amount: credit.amount };
  }

  const order = pick[0];
  return applyCredit(row.id, order.id, order.number, credit);
}

/** Customer typed a UTR: if that credit already arrived by SMS for the right amount, settle now. */
export async function matchSubmittedUtr(orderId: string, utr: string): Promise<boolean> {
  const db = await getDb();
  const [credit] = await db
    .select()
    .from(schema.bankCredits)
    .where(and(eq(schema.bankCredits.utr, utr), inArray(schema.bankCredits.status, ["unmatched", "ambiguous"])));
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!credit || !order || credit.amount !== order.total) return false;
  const r = await applyCredit(credit.id, order.id, order.number, credit);
  return r.result === "matched";
}

async function applyCredit(creditId: number, orderId: string, orderNumber: string, credit: ParsedCredit): Promise<SmsResult> {
  const db = await getDb();
  const paid = await markOrderPaid(orderId, {
    amount: credit.amount,
    gatewayPaymentId: credit.utr,
    source: `bank SMS${credit.payer ? ` · from ${credit.payer}` : ""}`,
  });
  if (!paid) {
    await db.update(schema.bankCredits).set({ status: "unmatched" }).where(eq(schema.bankCredits.id, creditId));
    return { result: "unmatched", utr: credit.utr, amount: credit.amount };
  }
  await db.update(schema.bankCredits).set({ status: "matched", orderId }).where(eq(schema.bankCredits.id, creditId));
  return { result: "matched", utr: credit.utr, order: orderNumber };
}
