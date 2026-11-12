import {NextRequest, NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE, parentFromSessionToken} from "@/lib/parent-auth";
import {isEnglishSsoProduct, issueEnglishSsoTicket, ssoBackendKey} from "@/lib/english-sso-ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control": "private, no-store, max-age=0"};
const reply = (data: object, status: number) => NextResponse.json(data, {status, headers});

export async function POST(req: NextRequest) {
  // Never issue app identity based on cross-site POST or a client-provided ID.
  const expectedOrigin = process.env.SOCTHINK_PUBLIC_ORIGIN || "https://socthink.cn";
  if (req.headers.get("origin") !== expectedOrigin ||
      req.headers.get("sec-fetch-site") === "cross-site" ||
      !req.headers.get("content-type")?.startsWith("application/json"))
    return reply({code: "BAD_ORIGIN"}, 403);
  const user = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!user?.active || !(user.wechatId || user.wechatOpenId))
    return reply({code: "WECHAT_LOGIN_REQUIRED", loginUrl: "/login"}, 401);
  let product: unknown;
  try {
    const body = await req.text();
    if (body.length > 256) return reply({code: "BAD_REQUEST"}, 400);
    product = (JSON.parse(body) as {product?: unknown}).product;
  } catch { return reply({code: "BAD_REQUEST"}, 400); }
  if (!isEnglishSsoProduct(product)) return reply({code: "INVALID_PRODUCT"}, 400);
  if (!ssoBackendKey(product)) return reply({code: "SSO_NOT_CONFIGURED"}, 503);
  try {
    const issued = issueEnglishSsoTicket(product, user.id);
    return reply(issued, 200);
  } catch { return reply({code: "SSO_UNAVAILABLE"}, 503); }
}
