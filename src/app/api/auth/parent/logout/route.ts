import { NextRequest, NextResponse } from "next/server";
import { PARENT_SESSION_COOKIE } from "@/lib/parent-auth";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const secure = req.nextUrl.protocol === "https:";

  response.cookies.set(PARENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
  });

  if (req.nextUrl.hostname === "socthink.cn" || req.nextUrl.hostname.endsWith(".socthink.cn")) {
    const attributes = [
      PARENT_SESSION_COOKIE + "=",
      "Path=/",
      "Domain=.socthink.cn",
      "Max-Age=0",
      "HttpOnly",
      "SameSite=Strict",
      secure ? "Secure" : "",
    ].filter(Boolean);
    response.headers.append("Set-Cookie", attributes.join("; "));
  }

  return response;
}
