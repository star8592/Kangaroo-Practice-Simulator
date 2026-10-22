import { NextRequest, NextResponse } from "next/server";
import { createGuestSessionToken, createFamilyPracticeSessionToken, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";
import {hasFullExamAccess} from "@/lib/exam-access";

/** Same-origin navigation bootstrap; no credentials or personal information required. */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("next") || "/arithmetic";
  // Only local application paths may be used as redirect destinations.
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\") || /[\r\n]/.test(target)) {
    return NextResponse.json({ error: "invalid destination" }, { status: 400 });
  }
  const existing = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  const protectedExam=target.startsWith("/exam/");
  // A verified household is a full free user, never an anonymous guest.
  // Do not silently create an anonymous exam session on an untrusted link.
  if(protectedExam && !parent && !hasFullExamAccess(existing)){
    return new NextResponse(null,{status:307,headers:{location:"/login?next="+encodeURIComponent(target)}});
  }
  // Use a relative Location header. Production sits behind a reverse proxy, so
  // req.nextUrl.origin can be the internal localhost origin and must never leak
  // into a browser redirect. Relative redirects stay on the public origin.
  const response = new NextResponse(null, { status: 307, headers: { location: target } });
  // Never change an active registered learner during a session. Only bootstrap identity
  // when no student session exists. The parent-linked provisional ID is stable.
  if (!existing || (protectedExam && parent && !hasFullExamAccess(existing))) {
    const token = parent
      ? createFamilyPracticeSessionToken(parent.id)
      : createGuestSessionToken();
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
      maxAge: parent ? 30*24*60*60 : 7200,
    });
  }
  return response;
}
