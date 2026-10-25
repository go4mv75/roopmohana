"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { PaymentMethod } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { createOrder, OrderError } from "@/lib/orders";
import { quoteCart, type CartInput, type Quote } from "@/lib/pricing";
import { enabledMethods, startPayment, type PaymentStart } from "@/lib/payments";
import { checkoutOptions } from "@/lib/payments/razorpay";
import { rateLimit } from "@/lib/rate-limit";

const cartSchema = z
  .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(10) }))
  .max(50);

export async function getQuote(cart: CartInput, couponCode: string | null, method: PaymentMethod): Promise<Quote> {
  const user = await getCurrentUser();
  const parsed = cartSchema.safeParse(cart);
  return quoteCart(parsed.success ? parsed.data : [], { couponCode, userId: user?.id, method });
}

const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, "").slice(-10))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(4, "Enter your house / street address").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Select your state").max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
});

export type PlaceOrderResult =
  | { error: string }
  | { orderId: string; start: PaymentStart; razorpay?: ReturnType<typeof checkoutOptions> };

export async function placeOrder(input: {
  cart: CartInput;
  couponCode: string | null;
  method: PaymentMethod;
  address: Record<string, string>;
  saveAddress: boolean;
  notes?: string;
}): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to place your order." };
  if (!(await rateLimit("order", 20, 60 * 60 * 1000))) return { error: "Too many attempts. Please wait a little." };
  if (!enabledMethods().includes(input.method)) return { error: "That payment method isn't available." };

  const cart = cartSchema.safeParse(input.cart);
  if (!cart.success || !cart.data.length) return { error: "Your bag is empty." };
  const address = addressSchema.safeParse(input.address);
  if (!address.success) return { error: address.error.issues[0].message };

  const db = await getDb();
  if (input.saveAddress) {
    const a = address.data;
    const existing = await db
      .select({ id: schema.addresses.id })
      .from(schema.addresses)
      .where(and(eq(schema.addresses.userId, user.id), eq(schema.addresses.line1, a.line1), eq(schema.addresses.pincode, a.pincode)));
    if (!existing.length) {
      const count = await db.$count(schema.addresses, eq(schema.addresses.userId, user.id));
      await db.insert(schema.addresses).values({ ...a, line2: a.line2 || null, userId: user.id, isDefault: count === 0 });
    }
  }
  if (!user.phone) {
    await db.update(schema.users).set({ phone: address.data.phone }).where(eq(schema.users.id, user.id));
  }

  try {
    const order = await createOrder({
      userId: user.id,
      email: user.email,
      phone: address.data.phone,
      address: { ...address.data, line2: address.data.line2 || null },
      cart: cart.data,
      couponCode: input.couponCode,
      method: input.method,
      notes: input.notes?.slice(0, 500),
    });
    const start = await startPayment(order);
    return {
      orderId: order.id,
      start,
      razorpay: start.kind === "razorpay" ? checkoutOptions(order, start.rzpOrderId, address.data.name) : undefined,
    };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("[checkout] failed", e);
    return { error: "We couldn't start the payment. Please try again or choose another method." };
  }
}

/** Retry payment for an existing unpaid order (e.g. after closing the Razorpay window). */
export async function retryPayment(orderId: string): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, user.id)));
  if (!order || order.paymentStatus === "paid" || order.status !== "pending_payment") return { error: "This order can't be paid again." };
  try {
    if (order.paymentStatus !== "pending") {
      await db.update(schema.orders).set({ paymentStatus: "pending" }).where(eq(schema.orders.id, orderId));
    }
    const start = await startPayment(order);
    return {
      orderId,
      start,
      razorpay: start.kind === "razorpay" ? checkoutOptions(order, start.rzpOrderId, order.shippingAddress.name) : undefined,
    };
  } catch (e) {
    console.error("[checkout] retry failed", e);
    return { error: "Couldn't restart the payment. Please try again." };
  }
}
