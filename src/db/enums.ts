/** Shared with client components — keep free of database imports. */
export const ORDER_STATUSES = [
  "pending_payment",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["razorpay", "phonepe", "upi_direct", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
