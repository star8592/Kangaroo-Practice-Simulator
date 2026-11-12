import {NextRequest, NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE, parentFromSessionToken} from "@/lib/parent-auth";
import {
  backendKeyMatches, englishSsoSubject, isEnglishSsoProduct,
} from "@/lib/english-sso-ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control": "private, no-store, max-age=0"};
const reply = (data: object, status: number) => NextResponse.json(data, {status, headers});

/**
 * Independent product backend verifies that the current browser's original
 * SOC THINK WeChat cookie is STILL valid for the SAME product subject.
 * Use on private learning / grade / account requests to prevent account
 * switching or central logout leaving an unrelated product session active.
 * The application server forwards only the central parent cookie, never its
 * own auth_token cookie or the backend secret to a browser.
 */
export async function POST(req: NextRequest) {
  if (req.headers.has("origin") ||
      !req.headers.get("content-type")?.startsWith("application/json"))
    return reply({code:"SERVER_ONLY"},403);
  let product: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 256) return reply({code:"BAD_REQUEST"},400);
    product = (JSON.parse(raw) as {product?:unknown}).product;
  } catch {return reply({code:"BAD_REQUEST"},400);}
  if (!isEnglishSsoProduct(product)) return reply({code:"INVALID_PRODUCT"},400);
  const bearer = req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1] || "";
  if (!backendKeyMatches(product,bearer))
    return reply({code:"UNAUTHORIZED_BACKEND"},401);
  const user = parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if (!user?.active || !(user.wechatId || user.wechatOpenId))
    return reply({code:"WECHAT_SESSION_EXPIRED"},401);
  return reply({product,subject:englishSsoSubject(product,user.id)},200);
}
