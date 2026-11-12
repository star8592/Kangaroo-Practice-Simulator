import {NextRequest, NextResponse} from "next/server";
import {
  backendKeyMatches, isEnglishSsoProduct, redeemEnglishSsoTicket,
} from "@/lib/english-sso-ticket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = {"Cache-Control": "private, no-store, max-age=0"};
const reply = (data: object, status: number) => NextResponse.json(data, {status, headers});

export async function POST(req: NextRequest) {
  // Intended for application servers only; browser-origin calls always fail.
  if (req.headers.has("origin") || !req.headers.get("content-type")?.startsWith("application/json"))
    return reply({code: "SERVER_ONLY"}, 403);
  let product: unknown, ticket: unknown;
  try {
    const raw = await req.text();
    if (raw.length > 512) return reply({code: "BAD_REQUEST"}, 400);
    ({product, ticket} = JSON.parse(raw) as {product?: unknown; ticket?: unknown});
  } catch { return reply({code: "BAD_REQUEST"}, 400); }
  if (!isEnglishSsoProduct(product) || typeof ticket !== "string")
    return reply({code: "BAD_REQUEST"}, 400);
  const bearer = req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1] || "";
  if (!backendKeyMatches(product, bearer))
    return reply({code: "UNAUTHORIZED_BACKEND"}, 401);
  const consumed = redeemEnglishSsoTicket(product, ticket);
  if (!consumed) return reply({code: "TICKET_EXPIRED_OR_USED"}, 410);
  return reply(consumed, 200);
}
