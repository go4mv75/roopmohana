import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db";
import { isAdminEmail, normalizeEmail } from "@/lib/auth";
import { SESSION_COOKIE, issueSessionToken, sessionCookieOptions, verifyToken } from "@/lib/auth/session";
import { siteUrl } from "@/lib/config";

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(req: NextRequest) {
  const fail = () => NextResponse.redirect(new URL("/login?error=google", siteUrl()));
  const code = req.nextUrl.searchParams.get("code");
  const stateToken = req.nextUrl.searchParams.get("state");
  const nonce = req.cookies.get("rm_oauth")?.value;
  if (!code || !stateToken || !nonce) return fail();

  const state = await verifyToken<{ nonce: string; next: string }>(stateToken);
  if (!state || state.nonce !== nonce) return fail();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${siteUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail();
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail();

  let claims: { sub: string; email?: string; email_verified?: boolean; name?: string };
  try {
    const { payload } = await jwtVerify(id_token, googleJwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    claims = payload as typeof claims;
  } catch {
    return fail();
  }
  if (!claims.email || !claims.email_verified) return fail();

  const email = normalizeEmail(claims.email);
  const db = await getDb();
  let [user] = await db.select().from(schema.users).where(eq(schema.users.googleId, claims.sub));
  if (!user) {
    [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (user) {
      [user] = await db
        .update(schema.users)
        .set({ googleId: claims.sub })
        .where(eq(schema.users.id, user.id))
        .returning();
    } else {
      [user] = await db
        .insert(schema.users)
        .values({ id: nanoid(), email, name: claims.name ?? email.split("@")[0], googleId: claims.sub })
        .returning();
    }
  }
  // Google has verified the address, so owner emails listed in ADMIN_EMAILS are promoted here.
  if (user.role !== "admin" && isAdminEmail(email)) {
    [user] = await db.update(schema.users).set({ role: "admin" }).where(eq(schema.users.id, user.id)).returning();
  }

  const dest = user.role === "admin" && state.next === "/account" ? "/admin" : state.next;
  const res = NextResponse.redirect(new URL(dest, siteUrl()));
  res.cookies.set(
    SESSION_COOKIE,
    await issueSessionToken({ uid: user.id, role: user.role, v: user.sessionVersion }),
    sessionCookieOptions,
  );
  res.cookies.delete({ name: "rm_oauth", path: "/api/auth/google" });
  return res;
}
