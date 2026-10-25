import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { shipping } from "./config";
import type { PaymentMethod } from "@/db/schema";

export type CartInput = { productId: number; quantity: number }[];

export type PricedLine = {
  productId: number;
  name: string;
  slug: string;
  sku: string | null;
  image: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
};

export type Quote = {
  lines: PricedLine[];
  problems: string[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponMessage: string | null;
  shippingFee: number;
  total: number;
};

const MAX_QTY = 10;

/**
 * Prices a cart from the database (never trusting client prices), applies a
 * coupon and shipping rules. Used for the checkout preview and again when
 * the order is actually created.
 */
export async function quoteCart(
  cart: CartInput,
  opts: { couponCode?: string | null; userId?: string | null; method?: PaymentMethod } = {},
): Promise<Quote> {
  const db = await getDb();
  const merged = new Map<number, number>();
  for (const { productId, quantity } of cart) {
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) continue;
    merged.set(productId, Math.min(MAX_QTY, (merged.get(productId) ?? 0) + quantity));
  }
  const ids = [...merged.keys()];
  const rows = ids.length
    ? await db
        .select()
        .from(schema.products)
        .where(and(inArray(schema.products.id, ids), eq(schema.products.active, true)))
    : [];

  const problems: string[] = [];
  const lines: PricedLine[] = [];
  for (const id of ids) {
    const p = rows.find((r) => r.id === id);
    if (!p) {
      problems.push("An item in your bag is no longer available and was removed.");
      continue;
    }
    let quantity = merged.get(id)!;
    if (p.stock <= 0) {
      problems.push(`${p.name} is sold out.`);
      continue;
    }
    if (quantity > p.stock) {
      problems.push(`Only ${p.stock} left of ${p.name}.`);
      quantity = p.stock;
    }
    lines.push({
      productId: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      image: p.images[0] ?? null,
      unitPrice: p.price,
      quantity,
      stock: p.stock,
      lineTotal: p.price * quantity,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discount = 0;
  let couponCode: string | null = null;
  let couponMessage: string | null = null;
  const code = opts.couponCode?.trim().toUpperCase();
  if (code && subtotal > 0) {
    const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code));
    const invalid = (m: string) => (couponMessage = m);
    if (!c || !c.active) invalid("This code isn't valid.");
    else if (c.expiresAt && c.expiresAt < new Date()) invalid("This code has expired.");
    else if (c.usageLimit != null && c.usedCount >= c.usageLimit) invalid("This code has been fully redeemed.");
    else if (subtotal < c.minSubtotal) invalid(`Add items worth ₹${Math.ceil((c.minSubtotal - subtotal) / 100)} more to use this code.`);
    else if (c.firstOrderOnly && !opts.userId) invalid("Sign in to use this first-order code.");
    else {
      let eligible = true;
      if (c.firstOrderOnly && opts.userId) {
        const [{ n }] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(schema.orders)
          .where(and(eq(schema.orders.userId, opts.userId), ne(schema.orders.status, "pending_payment"), ne(schema.orders.status, "cancelled")));
        if (n > 0) {
          eligible = false;
          invalid("This code is valid on your first order only.");
        }
      }
      if (eligible) {
        discount = c.kind === "percent" ? Math.floor((subtotal * c.value) / 100) : c.value;
        if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
        discount = Math.min(discount, subtotal);
        couponCode = c.code;
        couponMessage = c.description ?? "Code applied.";
      }
    }
  }

  const afterDiscount = subtotal - discount;
  const isCod = opts.method === "cod";
  let shippingFee = 0;
  if (subtotal > 0) {
    // Threshold uses the pre-discount subtotal so applying a coupon never adds a shipping fee.
    if (isCod || subtotal < shipping.freeAbove) shippingFee = shipping.flatFee;
    if (isCod) shippingFee += shipping.codFee;
  }

  return {
    lines,
    problems,
    subtotal,
    discount,
    couponCode,
    couponMessage,
    shippingFee,
    total: afterDiscount + shippingFee,
  };
}
