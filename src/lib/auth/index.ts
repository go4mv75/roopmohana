import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { readSession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "admin";
};

/** The signed-in user, re-checked against the database on every request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session?.uid) return null;
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.uid)).limit(1);
  if (!user || user.sessionVersion !== session.v) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
});

export async function requireUser(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function isAdminEmail(email: string) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => normalizeEmail(s))
    .filter(Boolean);
  return list.includes(normalizeEmail(email));
}
