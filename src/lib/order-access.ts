import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "./auth";

/** Loads an order only if the signed-in user owns it (or is the owner/admin). */
export async function getOwnedOrder(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!order) return null;
  if (order.userId !== user.id && user.role !== "admin") return null;
  return order;
}
