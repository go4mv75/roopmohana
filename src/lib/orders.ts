import "server-only";
import { after } from "next/server";
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { getDb, schema } from "@/db";
import type { Order, OrderAddress, OrderStatus, PaymentMethod } from "@/db/schema";
import { quoteCart, type CartInput } from "./pricing";
import { sendMail, mailLayout, escapeHtml } from "./email";
import { money, statusLabel } from "./format";
import { siteUrl, store } from "./config";

// Gateways accept [A-Za-z0-9_-]; keep ids opaque and unguessable.
const orderId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 20);
const orderNumber = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export class OrderError extends Error {}

/** Run after the response when inside a request (keeps serverless alive), else fire-and-forget. */
function background(fn: () => Promise<void>) {
  try {
    after(fn);
  } catch {
    void fn().catch((e) => console.error(e));
  }
}

export async function createOrder(input: {
  userId: string;
  email: string;
  phone: string;
  address: OrderAddress;
  cart: CartInput;
  couponCode?: string | null;
  method: PaymentMethod;
  notes?: string | null;
}): Promise<Order> {
  const quote = await quoteCart(input.cart, {
    couponCode: input.couponCode,
    userId: input.userId,
    method: input.method,
  });
  if (!quote.lines.length) throw new OrderError(quote.problems[0] ?? "Your bag is empty.");
  if (quote.problems.length) throw new OrderError(quote.problems.join(" "));

  const db = await getDb();
  const id = orderId();
  const isCod = input.method === "cod";

  const order = await db.transaction(async (tx) => {
    const upiOffset = input.method === "upi_direct" ? await pickUpiOffset(tx, quote.total) : 0;
    const [o] = await tx
      .insert(schema.orders)
      .values({
        id,
        number: `RM-${orderNumber()}`,
        userId: input.userId,
        email: input.email,
        phone: input.phone,
        shippingAddress: input.address,
        subtotal: quote.subtotal,
        discount: quote.discount,
        shippingFee: quote.shippingFee,
        upiOffset,
        total: quote.total - upiOffset,
        couponCode: quote.couponCode,
        paymentMethod: input.method,
        status: isCod ? "confirmed" : "pending_payment",
        paymentStatus: isCod ? "unpaid" : "pending",
        notes: input.notes || null,
      })
      .returning();
    await tx.insert(schema.orderItems).values(
      quote.lines.map((l) => ({
        orderId: id,
        productId: l.productId,
        name: l.name,
        slug: l.slug,
        image: l.image,
        sku: l.sku,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
    );
    await tx.insert(schema.orderEvents).values({
      orderId: id,
      type: "created",
      message: `Order placed · ${money(o.total)} via ${input.method}`,
    });
    if (isCod) await commitInventory(tx, o);
    return o;
  });

  if (isCod) background(() => sendOrderConfirmation(order.id));
  return order;
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

/** Direct-UPI orders still waiting for money: the ones a bank SMS could belong to. */
export const UPI_MATCH_WINDOW_MS = 48 * 3600_000;

/**
 * Picks how many paise (0–99) to take off a direct-UPI order so no other
 * waiting UPI order has the same amount. 0 when the amount is already unique.
 */
async function pickUpiOffset(tx: Tx, total: number): Promise<number> {
  const taken = await tx
    .select({ total: schema.orders.total })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.paymentMethod, "upi_direct"),
        inArray(schema.orders.paymentStatus, ["pending", "failed"]),
        gte(schema.orders.createdAt, new Date(Date.now() - UPI_MATCH_WINDOW_MS)),
        lte(schema.orders.total, total),
        gte(schema.orders.total, total - 99),
      ),
    );
  const used = new Set(taken.map((t) => t.total));
  for (let offset = 0; offset <= Math.min(99, total - 1); offset++) {
    if (!used.has(total - offset)) return offset;
  }
  throw new OrderError("Too many UPI payments are waiting for this amount. Please choose another payment method.");
}

/** Decrements stock and counts coupon usage once an order is real (paid or COD). */
async function commitInventory(tx: Tx, order: Order) {
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  for (const it of items) {
    if (!it.productId) continue;
    await tx
      .update(schema.products)
      .set({ stock: sql`greatest(${schema.products.stock} - ${it.quantity}, 0)` })
      .where(eq(schema.products.id, it.productId));
  }
  if (order.couponCode) {
    await tx
      .update(schema.coupons)
      .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
      .where(eq(schema.coupons.code, order.couponCode));
  }
}

/**
 * Idempotently marks an order as paid. Safe to call from the browser callback,
 * webhooks and status polling at the same time: only the first call wins.
 */
export async function markOrderPaid(
  id: string,
  info: { amount: number; gatewayPaymentId?: string | null; source: string },
): Promise<boolean> {
  const db = await getDb();
  const won = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
    if (!current || current.paymentStatus === "paid") return false;
    if (info.amount !== current.total) {
      await tx.insert(schema.orderEvents).values({
        orderId: id,
        type: "payment_mismatch",
        message: `Payment amount ${money(info.amount)} does not match order total ${money(current.total)} (${info.source}). Not marked paid.`,
      });
      return false;
    }
    const [o] = await tx
      .update(schema.orders)
      .set({
        paymentStatus: "paid",
        status: current.status === "pending_payment" || current.status === "cancelled" ? "confirmed" : current.status,
        paidAt: new Date(),
        gatewayPaymentId: info.gatewayPaymentId ?? current.gatewayPaymentId,
      })
      .where(and(eq(schema.orders.id, id), ne(schema.orders.paymentStatus, "paid")))
      .returning();
    if (!o) return false;
    await tx.insert(schema.orderEvents).values({
      orderId: id,
      type: "paid",
      message: `Payment received ${money(info.amount)} (${info.source}${info.gatewayPaymentId ? ` · ${info.gatewayPaymentId}` : ""})`,
    });
    await commitInventory(tx, o);
    return true;
  });
  if (won) background(() => sendOrderConfirmation(id));
  return won;
}

export async function markPaymentFailed(id: string, reason: string) {
  const db = await getDb();
  const [o] = await db
    .update(schema.orders)
    .set({ paymentStatus: "failed" })
    .where(and(eq(schema.orders.id, id), eq(schema.orders.paymentStatus, "pending")))
    .returning();
  if (o) await db.insert(schema.orderEvents).values({ orderId: id, type: "payment_failed", message: reason });
}

export async function addOrderEvent(orderIdValue: string, type: string, message: string) {
  const db = await getDb();
  await db.insert(schema.orderEvents).values({ orderId: orderIdValue, type, message });
}

export async function getOrderWithItems(id: string) {
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id));
  const events = await db
    .select()
    .from(schema.orderEvents)
    .where(eq(schema.orderEvents.orderId, id))
    .orderBy(schema.orderEvents.createdAt);
  return { order, items, events };
}

async function sendOrderConfirmation(id: string) {
  const data = await getOrderWithItems(id);
  if (!data) return;
  const { order, items } = data;
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.name)} × ${i.quantity}</td><td style="text-align:right">${money(i.unitPrice * i.quantity)}</td></tr>`,
    )
    .join("");
  const html = mailLayout(
    `Thank you — order ${order.number} is confirmed`,
    `<p>We've received your order and will dispatch it within 1–3 business days.</p>
     <table style="width:100%;border-collapse:collapse">${rows}
      <tr><td style="padding-top:12px;border-top:1px solid #ddd">Total</td><td style="padding-top:12px;border-top:1px solid #ddd;text-align:right"><b>${money(order.total)}</b></td></tr></table>
     <p><a href="${siteUrl()}/order/${order.id}" style="color:#7a1f2b">View your order</a></p>`,
  );
  await sendMail({ to: order.email, subject: `Order ${order.number} confirmed · ${store.name}`, html });
  const owner = process.env.OWNER_NOTIFY_EMAIL;
  if (owner) {
    await sendMail({
      to: owner,
      subject: `New order ${order.number} · ${money(order.total)} (${order.paymentMethod})`,
      html: mailLayout(`New order ${order.number}`, `${rows ? `<table style="width:100%">${rows}</table>` : ""}<p><a href="${siteUrl()}/admin/orders/${order.id}">Open in dashboard</a></p>`),
    });
  }
}

export async function sendStatusUpdate(order: Order, status: OrderStatus) {
  const tracking =
    status === "shipped" && order.trackingNumber
      ? `<p>Courier: ${escapeHtml(order.trackingCarrier ?? "")}<br/>Tracking number: <b>${escapeHtml(order.trackingNumber)}</b></p>`
      : "";
  await sendMail({
    to: order.email,
    subject: `Order ${order.number}: ${statusLabel[status]}`,
    html: mailLayout(
      `Your order is ${statusLabel[status].toLowerCase()}`,
      `${tracking}<p><a href="${siteUrl()}/order/${order.id}" style="color:#7a1f2b">View order ${order.number}</a></p>`,
    ),
  });
}
