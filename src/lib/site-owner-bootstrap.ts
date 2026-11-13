import type { NextRequest } from "next/server";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "./auth";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "./parent-auth";

export function sameOriginMutation(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  return origin === req.nextUrl.origin
    && (!fetchSite || fetchSite === "same-origin");
}

export function bootstrapIdentity(req: NextRequest) {
  const admin = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const parent = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!admin || !isAdmin(admin) || !parent?.active || !(parent.wechatId || parent.wechatOpenId)) return null;
  return { admin, parent };
}
