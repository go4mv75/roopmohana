"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/auth/session";

type State = { ok?: string; error?: string } | undefined;

export async function deleteAddress(id: number) {
  const user = await getCurrentUser();
  if (!user) return;
  const db = await getDb();
  await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  revalidatePath("/account");
}

export async function updateProfile(_: State, form: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const db = await getDb();
  await db
    .update(schema.users)
    .set({ name: parsed.data.name, phone: parsed.data.phone.replace(/\D/g, "").slice(-10) })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/account");
  return { ok: "Profile updated." };
}

export async function changePassword(_: State, form: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const db = await getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
  if (row.passwordHash && !(await verifyPassword(current, row.passwordHash))) return { error: "Current password is incorrect." };
  const v = row.sessionVersion + 1;
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), sessionVersion: v }).where(eq(schema.users.id, user.id));
  // Signs out every other device, keeps this one.
  await createSession({ uid: row.id, role: row.role, v });
  return { ok: "Password changed. Other devices have been signed out." };
}
