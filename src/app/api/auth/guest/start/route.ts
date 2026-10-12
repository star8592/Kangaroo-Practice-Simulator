import { NextRequest, NextResponse } from "next/server";
import { createGuestSessionToken, createFamilyPracticeSessionToken, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";

/** Same-origin navigation bootstrap; no credentials or personal information required. */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("next") || "/arithmetic";
  // Only local application paths may be used as redirect destinations.
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\") || /[\r\n]/.test(target)) {
    return NextResponse.json({ error: "invalid destination" }, { status: 400 });
  }
  // Guest bootstrap is only for public/basic training, never full exams.
  if (target.startsWith("/exam/")) {
    return new NextResponse(null, { status: 307, headers: { location: "/login?next=" + encodeURIComponent(target) } });
  }
  const existing = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  // Use a relative Location header. Production sits behind a reverse proxy, so
  // req.nextUrl.origin can be the internal localhost origin and must never leak
  // into a browser redirect. Relative redirects stay on the public origin.
  const response = new NextResponse(null, { status: 307, headers: { location: target } });
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  // Never change an active learner during a session. Only bootstrap identity
  // when no student session exists. The parent-linked provisional ID is stable.
  if (!existing) {
    const token = parent
      ? createFamilyPracticeSessionToken(parent.id)
      : createGuestSessionToken();
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
      maxAge: parent ? 604800 : 7200,
    });
  }
  return response;
}
