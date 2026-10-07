import { NextRequest, NextResponse } from "next/server";
import { createGuestSessionToken, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";

/** Same-origin navigation bootstrap; no credentials or personal information required. */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("next") || "/arithmetic";
  // Only local application paths may be used as redirect destinations.
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\") || /[\r\n]/.test(target)) {
    return NextResponse.json({ error: "invalid destination" }, { status: 400 });
  }
  const existing = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  // Use a relative Location header. Production sits behind a reverse proxy, so
  // req.nextUrl.origin can be the internal localhost origin and must never leak
  // into a browser redirect. Relative redirects stay on the public origin.
  const response = new NextResponse(null, { status: 307, headers: { location: target } });
  if (!existing) {
    response.cookies.set(SESSION_COOKIE, createGuestSessionToken(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7200,
    });
  }
  return response;
}
