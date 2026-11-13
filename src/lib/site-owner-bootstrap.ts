import type { NextRequest } from "next/server";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "./auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "./parent-auth";

export function sameOriginMutation(req: NextRequest): boolean {
  // Behind the canonical SOC THINK Nginx proxy, req.nextUrl.origin may
  // describe the internal HTTP upstream rather than the public HTTPS origin.
  // For production, compare the browser's Origin to the fixed public site,
  // never to untrusted x-forwarded-* headers or a client-provided body field.
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    const parsed = new URL(origin);
    if (process.env.NODE_ENV === "production") {
      return parsed.origin === "https://socthink.cn";
    }
    const host = req.headers.get("host") || req.nextUrl.host;
    return parsed.host === host && (parsed.protocol === "https:" || parsed.protocol === "http:");
  } catch {
    return false;
  }
}

export function bootstrapIdentity(req: NextRequest) {
  const admin = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!admin || !isAdmin(admin) || !parent?.active || !(parent.wechatId || parent.wechatOpenId)) return null;
  return { admin, parent };
}
