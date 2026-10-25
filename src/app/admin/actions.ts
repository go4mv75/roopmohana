"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { rupeesToPaise, slugify, statusLabel } from "@/lib/format";
import { addOrderEvent, markOrderPaid, sendStatusUpdate } from "@/lib/orders";

type State = { ok?: string; error?: string } | undefined;

/* ───────────── Orders ───────────── */

export async function updateOrderStatus(orderId: string, _: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const status = String(form.get("status")) as OrderStatus;
  if (!ORDER_STATUSES.includes(status)) return { error: "Unknown status." };
  const carrier = String(form.get("trackingCarrier") ?? "").trim() || null;
  const tracking = String(form.get("trackingNumber") ?? "").trim() || null;
  const notify = form.get("notify") === "on";

  const db = await getDb();
  const [before] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!before) return { error: "Order not found." };
  if (status === "shipped" && !tracking && !before.trackingNumber) return { error: "Add a tracking number before marking as shipped." };
  if (["packed", "shipped", "delivered"].includes(status) && before.paymentStatus !== "paid" && before.paymentMethod !== "cod") {
    return { error: "This order isn't paid yet." };
  }

  const [order] = await db
    .update(schema.orders)
    .set({
      status,
      trackingCarrier: carrier ?? before.trackingCarrier,
      trackingNumber: tracking ?? before.trackingNumber,
      // Delivered COD orders have been paid in cash.
      ...(status === "delivered" && before.paymentMethod === "cod" && before.paymentStatus !== "paid"
        ? { paymentStatus: "paid" as const, paidAt: new Date() }
        : {}),
    })
    .where(eq(schema.orders.id, orderId))
    .returning();

  // Put stock back when a confirmed order is cancelled.
  if (status === "cancelled" && before.status !== "cancelled" && (before.paymentStatus === "paid" || before.paymentMethod === "cod")) {
    const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
    for (const it of items) {
      if (it.productId)
        await db
          .update(schema.products)
          .set({ stock: sql`${schema.products.stock} + ${it.quantity}` })
          .where(eq(schema.products.id, it.productId));
    }
  }

  if (before.status !== status) {
    await addOrderEvent(orderId, "status", `${statusLabel[before.status]} → ${statusLabel[status]} (by ${admin.name})`);
    if (notify && ["confirmed", "shipped", "delivered", "cancelled"].includes(status)) await sendStatusUpdate(order, status);
  } else if (tracking && tracking !== before.trackingNumber) {
    await addOrderEvent(orderId, "tracking", `Tracking updated: ${carrier ?? ""} ${tracking}`);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: "Order updated." };
}

/** Confirms a direct-UPI or COD payment after the owner sees it in the bank app. */
export async function confirmManualPayment(orderId: string) {
  const admin = await requireAdmin();
  const db = await getDb();
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!o || o.paymentStatus === "paid") return;
  await markOrderPaid(orderId, { amount: o.total, gatewayPaymentId: o.gatewayPaymentId, source: `manual · ${admin.name}` });
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function rejectManualPayment(orderId: string) {
  const admin = await requireAdmin();
  const db = await getDb();
  await db
    .update(schema.orders)
    .set({ paymentStatus: "failed", gatewayPaymentId: null })
    .where(and(eq(schema.orders.id, orderId), ne(schema.orders.paymentStatus, "paid")));
  await addOrderEvent(orderId, "payment_rejected", `UPI reference not found — marked unpaid (by ${admin.name})`);
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function saveAdminNotes(orderId: string, form: FormData) {
  await requireAdmin();
  const db = await getDb();
  await db
    .update(schema.orders)
    .set({ adminNotes: String(form.get("adminNotes") ?? "").slice(0, 4000) })
    .where(eq(schema.orders.id, orderId));
  revalidatePath(`/admin/orders/${orderId}`);
}

/* ───────────── Products ───────────── */

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(140),
  slug: z.string().trim().max(90).optional(),
  sku: z.string().trim().max(60).optional(),
  categoryId: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  compareAtPrice: z.string().optional(),
  stock: z.coerce.number().int().min(0).max(100000),
  material: z.string().trim().max(80).optional(),
  weightGrams: z.string().trim().max(20).optional(),
  shortDescription: z.string().max(2000).optional(),
  description: z.string().max(20000).optional(),
  images: z.string(),
});

export async function saveProduct(id: number | null, _: State, form: FormData): Promise<State> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let price: number, compareAtPrice: number | null;
  try {
    price = rupeesToPaise(d.price);
    compareAtPrice = d.compareAtPrice ? rupeesToPaise(d.compareAtPrice) : null;
  } catch {
    return { error: "Enter prices as numbers, e.g. 2499" };
  }
  if (price <= 0) return { error: "Price must be more than zero." };
  if (compareAtPrice != null && compareAtPrice <= price) compareAtPrice = null;

  let images: string[];
  try {
    images = z.array(z.string().min(1)).max(12).parse(JSON.parse(d.images));
  } catch {
    return { error: "Image list is invalid." };
  }

  const values = {
    name: d.name,
    slug: slugify(d.slug || d.name),
    sku: d.sku || null,
    categoryId: d.categoryId ? Number(d.categoryId) : null,
    price,
    compareAtPrice,
    stock: d.stock,
    material: d.material || "925 Sterling Silver",
    weightGrams: d.weightGrams || null,
    shortDescription: d.shortDescription?.trim() || null,
    description: d.description?.trim() || null,
    images,
    featured: form.get("featured") === "on",
    active: form.get("active") === "on",
  };
  if (!values.slug) return { error: "Slug is required." };

  const db = await getDb();
  const [clash] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.slug, values.slug), id ? ne(schema.products.id, id) : undefined));
  if (clash) return { error: `Another product already uses the URL “${values.slug}”.` };

  if (id) {
    await db.update(schema.products).set(values).where(eq(schema.products.id, id));
  } else {
    const [row] = await db.insert(schema.products).values(values).returning({ id: schema.products.id });
    id = row.id;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/products/${id}?saved=1`);
}

export async function toggleProduct(id: number, field: "active" | "featured") {
  await requireAdmin();
  const db = await getDb();
  await db
    .update(schema.products)
    .set({ [field]: sql`not ${schema.products[field]}` })
    .where(eq(schema.products.id, id));
  revalidatePath("/admin/products");
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  const db = await getDb();
  // Order history keeps its own copy of the name/price, so deleting is safe.
  await db.delete(schema.products).where(eq(schema.products.id, id));
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

/* ───────────── Categories ───────────── */

export async function saveCategory(_: State, form: FormData): Promise<State> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Name is required." };
  const slug = slugify(String(form.get("slug") || name));
  const values = {
    name,
    slug,
    description: String(form.get("description") ?? "").trim() || null,
    sortOrder: Number(form.get("sortOrder")) || 0,
  };
  const db = await getDb();
  try {
    if (id) await db.update(schema.categories).set(values).where(eq(schema.categories.id, id));
    else await db.insert(schema.categories).values(values);
  } catch {
    return { error: `The URL “${slug}” is already used by another category.` };
  }
  revalidatePath("/", "layout");
  return { ok: id ? "Category saved." : "Category added." };
}

export async function deleteCategory(id: number) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  revalidatePath("/", "layout");
}

/* ───────────── Coupons ───────────── */

export async function saveCoupon(_: State, form: FormData): Promise<State> {
  await requireAdmin();
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { error: "Code: 3–24 letters/numbers." };
  const kind = form.get("kind") === "flat" ? "flat" : "percent";
  const rawValue = Number(form.get("value"));
  if (!(rawValue > 0)) return { error: "Enter a discount value." };
  if (kind === "percent" && rawValue > 90) return { error: "Percent discount must be 90 or less." };
  const values = {
    code,
    kind: kind as "flat" | "percent",
    value: kind === "flat" ? Math.round(rawValue * 100) : Math.round(rawValue),
    description: String(form.get("description") ?? "").trim() || null,
    minSubtotal: Math.round(Number(form.get("minSubtotal") || 0) * 100),
    maxDiscount: form.get("maxDiscount") ? Math.round(Number(form.get("maxDiscount")) * 100) : null,
    usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : null,
    firstOrderOnly: form.get("firstOrderOnly") === "on",
    expiresAt: form.get("expiresAt") ? new Date(`${form.get("expiresAt")}T23:59:59+05:30`) : null,
    active: true,
  };
  const db = await getDb();
  await db
    .insert(schema.coupons)
    .values(values)
    .onConflictDoUpdate({ target: schema.coupons.code, set: { ...values, code: undefined } });
  revalidatePath("/admin/coupons");
  return { ok: `Saved ${code}.` };
}

export async function toggleCoupon(code: string) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.coupons).set({ active: sql`not ${schema.coupons.active}` }).where(eq(schema.coupons.code, code));
  revalidatePath("/admin/coupons");
}

/* ───────────── Enquiries ───────────── */

export async function setEnquiryStatus(id: number, status: "new" | "in_progress" | "closed") {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.enquiries).set({ status }).where(eq(schema.enquiries.id, id));
  revalidatePath("/admin/enquiries");
}
