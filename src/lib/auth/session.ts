import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rm_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = { uid: string; role: "customer" | "admin"; v: number };

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET (32+ chars) is required");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me-please-0123456789");
  }
  return new TextEncoder().encode(s);
}

/** expiresIn: seconds from now, or a jose duration string like "10m". */
export async function signToken(payload: Record<string, unknown>, expiresIn: string | number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // jose treats a bare number as an absolute epoch time, so convert relative seconds.
    .setExpirationTime(typeof expiresIn === "number" ? Math.floor(Date.now() / 1000) + expiresIn : expiresIn)
    .sign(secret());
}

export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

export const issueSessionToken = (payload: SessionPayload) => signToken(payload, MAX_AGE);

export async function createSession(payload: SessionPayload) {
  (await cookies()).set(SESSION_COOKIE, await issueSessionToken(payload), sessionCookieOptions);
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken<SessionPayload>(token);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
