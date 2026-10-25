"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail, mailLayout } from "@/lib/email";
import { siteUrl, store } from "@/lib/config";

export type FormState = { error?: string; ok?: string } | undefined;

/** Only allow same-site relative redirects. */
function safeNext(next: FormDataEntryValue | null, fallback = "/account") {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.email("Please enter a valid email").max(160),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("register", 10, 60 * 60 * 1000))) return { error: "Too many attempts. Try again later." };
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, phone, password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const db = await getDb();
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
  if (existing) return { error: "An account with this email already exists. Try signing in." };

  const id = nanoid();
  await db.insert(schema.users).values({
    id,
    email,
    name,
    phone: phone.replace(/\D/g, "").slice(-10),
    passwordHash: await hashPassword(password),
  });
  await createSession({ uid: id, role: "customer", v: 0 });
  redirect(safeNext(form.get("next")));
}

let dummyHash: Promise<string> | undefined;

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("login", 10, 15 * 60 * 1000))) return { error: "Too many attempts. Wait 15 minutes." };
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  // Compare against a dummy hash when the user is unknown to keep timing similar.
  dummyHash ??= hashPassword("not-a-real-password");
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  if (!user || !user.passwordHash || !ok) return { error: "Incorrect email or password." };

  await createSession({ uid: user.id, role: user.role, v: user.sessionVersion });
  redirect(safeNext(form.get("next"), user.role === "admin" ? "/admin" : "/account"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("reset", 5, 60 * 60 * 1000))) return { error: "Too many attempts. Try again later." };
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const generic = { ok: "If an account exists for that email, a reset link is on its way." };
  if (!email) return { error: "Enter your email." };

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) return generic;

  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResets).values({
    tokenHash: sha(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const link = `${siteUrl()}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: `Reset your ${store.name} password`,
    html: mailLayout(
      "Reset your password",
      `<p>Hi ${user.name.split(" ")[0]},</p><p>Use the link below to choose a new password. It expires in one hour.</p>
       <p><a href="${link}" style="color:#7a1f2b">Reset password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
    ),
  });
  return generic;
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.passwordResets)
    .where(
      and(
        eq(schema.passwordResets.tokenHash, sha(token)),
        isNull(schema.passwordResets.usedAt),
        gt(schema.passwordResets.expiresAt, new Date()),
      ),
    );
  if (!row) return { error: "This reset link is invalid or has expired." };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, row.userId));
  const v = user.sessionVersion + 1;
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password), sessionVersion: v })
    .where(eq(schema.users.id, user.id));
  await db
    .update(schema.passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResets.tokenHash, row.tokenHash));
  await createSession({ uid: user.id, role: user.role, v });
  redirect(user.role === "admin" ? "/admin" : "/account");
}
