/**
 * Store-wide configuration. Business facts live here so the owner can change
 * them in one place; secrets come from environment variables.
 */
export const store = {
  name: "Roop Mohana",
  devanagari: "रूप मोहना",
  tagline: "Timeless silver, crafted for everyday luxury",
  description:
    "Handcrafted 925 sterling silver jewellery — rings, pendants, bracelets, anklets and more. Quality-checked by hand, delivered across India.",
  email: process.env.NEXT_PUBLIC_STORE_EMAIL ?? "info@roopmohana.com",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE ?? "+91 86999 64258",
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "918699964258",
  instagram: "https://www.instagram.com/roopmohana",
  facebook: "https://www.facebook.com/roopmohana",
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS ?? "",
  gstin: process.env.NEXT_PUBLIC_STORE_GSTIN ?? "",
};

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/** Paise. Defaults mirror the current shipping policy: free above ₹1,000. */
export const shipping = {
  freeAbove: Number(process.env.FREE_SHIPPING_ABOVE ?? 1000) * 100,
  flatFee: Number(process.env.SHIPPING_FEE ?? 79) * 100,
  codFee: Number(process.env.COD_FEE ?? 49) * 100,
};

export const payments = {
  razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  phonepe: Boolean(process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET),
  /** Zero-fee UPI intent / QR straight to the shop's VPA. Owner confirms receipt. */
  upiDirect: Boolean(process.env.UPI_VPA),
  cod: process.env.COD_ENABLED === "true",
  /** Local testing only: simulates a gateway. Never enabled in production. */
  mock: process.env.PAYMENTS_MOCK === "true" && process.env.NODE_ENV !== "production",
};

export const upi = {
  vpa: process.env.UPI_VPA ?? "",
  payeeName: process.env.UPI_PAYEE_NAME ?? store.name,
  /** Bank SMS forwarding is set up, so direct-UPI payments confirm themselves. */
  autoVerify: (process.env.SMS_WEBHOOK_SECRET ?? "").length >= 16,
};
