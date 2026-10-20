import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { checkLoginLimit, clearLoginFailures, loginKey, recordLoginFailure } from "@/lib/login-rate-limit";

const ADMIN_TTL_SECONDS = 8 * 60 * 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  // Browser clients must come from the same site. Credentials are not accepted cross-origin.
  if (origin) {
    try {
      if (new URL(origin).host !== req.nextUrl.host) {
        return NextResponse.json({ error: "登录来源无效" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "登录来源无效" }, { status: 403 });
    }
  }
  let account: string;
  let pin: string;
  try {
    const body = await req.json();
    account = String(body?.username || "").trim().slice(0, 120);
    pin = String(body?.pin || "");
    if (!account || pin.length < 6 || pin.length > 128) throw new Error("invalid credentials");
  } catch {
    return NextResponse.json({ error: "请输入管理员账号和有效 PIN" }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim();
  const key = loginKey(account, ip);
  const limited = checkLoginLimit(key);
  if (!limited.allowed) return NextResponse.json(
    { error: "尝试次数过多，请稍后再试" },
    { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds), "Cache-Control": "no-store" } },
  );

  const user = authenticate(account, pin);
  if (!user || user.role !== "admin") {
    const fail = recordLoginFailure(key);
    return NextResponse.json(
      { error: "管理员账号或 PIN 不正确" },
      { status: fail.blockedUntil > Date.now() ? 429 : 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  clearLoginFailures(key);
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, ADMIN_TTL_SECONDS), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_TTL_SECONDS,
  });
  return response;
}
