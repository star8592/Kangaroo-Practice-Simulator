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
  const response = NextResponse.redirect(new URL(target, req.nextUrl.origin));
  if (!existing) {
    response.cookies.set(SESSION_COOKIE, createGuestSessionToken(), {
      httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 7200,
    });
  }
  return response;
}
