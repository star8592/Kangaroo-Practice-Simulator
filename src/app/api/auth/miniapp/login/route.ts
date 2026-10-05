import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSessionToken } from "@/lib/auth";
import { checkLoginLimit, clearLoginFailures, loginKey, recordLoginFailure } from "@/lib/login-rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const account = String(body?.username || body?.candidateNo || "");
    const pin = String(body?.pin || "");
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim();
    const key = loginKey(account, ip);
    const limit = checkLoginLimit(key);
    if (!limit.allowed) {
      return NextResponse.json({ error: "尝试次数过多，请稍后再试" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    }
    const user = authenticate(account, pin);
    if (!user) {
      const failed = recordLoginFailure(key);
      if (failed.blockedUntil > Date.now()) {
        return NextResponse.json({ error: "尝试次数过多，请稍后再试" }, { status: 429, headers: { "Retry-After": String(Math.ceil((failed.blockedUntil - Date.now()) / 1000)) } });
      }
      return NextResponse.json({ error: "账号、准考证号或 PIN 不正确" }, { status: 401 });
    }
    clearLoginFailures(key);
    return NextResponse.json({ ok: true, user, accessToken: createSessionToken(user.id) });
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 400 });
  }
}
