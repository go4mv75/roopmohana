import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ORDER_STATUSES, PAYMENT_METHODS } from "./enums";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash"),
    googleId: text("google_id"),
    role: text("role", { enum: ["customer", "admin"] }).notNull().default("customer"),
    // Bumped on password change / "log out everywhere" to invalidate existing sessions.
    sessionVersion: integer("session_version").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_google_idx").on(t.googleId)],
);

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
});

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    sku: text("sku"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    shortDescription: text("short_description"),
    description: text("description"),
    /** All money is stored in paise (1 INR = 100 paise). */
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    stock: integer("stock").notNull().default(0),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    material: text("material").notNull().default("925 Sterling Silver"),
    weightGrams: text("weight_grams"),
    featured: boolean("featured").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_active_idx").on(t.active)],
);

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  description: text("description"),
  kind: text("kind", { enum: ["percent", "flat"] }).notNull(),
  /** percent: 1-100; flat: paise */
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxDiscount: integer("max_discount"),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export type OrderAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export { ORDER_STATUSES, PAYMENT_METHODS };
export type { OrderStatus, PaymentMethod } from "./enums";

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    /** Human friendly, e.g. RM-24A9F3 */
    number: text("number").notNull().unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    shippingAddress: jsonb("shipping_address").$type<OrderAddress>().notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    shippingFee: integer("shipping_fee").notNull().default(0),
    total: integer("total").notNull(),
    couponCode: text("coupon_code"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending_payment"),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }).notNull(),
    paymentStatus: text("payment_status", { enum: ["unpaid", "pending", "paid", "failed", "refunded"] })
      .notNull()
      .default("unpaid"),
    /** Gateway order id (Razorpay order_xxx / PhonePe OMO...) */
    gatewayOrderId: text("gateway_order_id"),
    /** Gateway payment id / UPI UTR */
    gatewayPaymentId: text("gateway_payment_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    trackingCarrier: text("tracking_carrier"),
    trackingNumber: text("tracking_number"),
    notes: text("notes"),
    adminNotes: text("admin_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_gateway_idx").on(t.gatewayOrderId),
  ],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  image: text("image"),
  sku: text("sku"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  createdAt: createdAt(),
});

export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  kind: text("kind", { enum: ["contact", "customization"] }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  message: text("message").notNull(),
  budget: text("budget"),
  status: text("status", { enum: ["new", "in_progress", "closed"] }).notNull().default("new"),
  createdAt: createdAt(),
});

export const subscribers = pgTable("subscribers", {
  email: text("email").primaryKey(),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type Address = typeof addresses.$inferSelect;
