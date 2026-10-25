import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate: bounce visitors without a session cookie away from private areas.
 * Real authorization (role checks, session validity) happens on the server
 * in requireUser / requireAdmin.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("rm_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/checkout"] };
