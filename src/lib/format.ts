const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const inrPrecise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

/** Format paise as rupees. Whole rupees drop the decimals. */
export function money(paise: number): string {
  return paise % 100 === 0 ? inr.format(paise / 100) : inrPrecise.format(paise / 100);
}

export function rupeesToPaise(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[,₹\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const statusLabel: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const paymentLabel: Record<string, string> = {
  razorpay: "Razorpay (Cards / UPI / Netbanking)",
  phonepe: "PhonePe / UPI",
  upi_direct: "UPI (direct)",
  cod: "Cash on delivery",
};
