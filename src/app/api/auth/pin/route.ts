import { NextRequest, NextResponse } from "next/server";
import {
  changeStudentPin,
  createSessionToken,
  SESSION_COOKIE,
  userFromSessionToken,
} from "@/lib/auth";
import {
  checkLoginLimit,
  clearLoginFailures,
  loginKey,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export async function POST(req: NextRequest) {
  const user = userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "student") {
    return NextResponse.json({ error: "仅学生账号可修改学生 PIN" }, { status: 403 });
  }

  const ip = (
    req.headers.get("x-forwarded-for")
    || req.headers.get("x-real-ip")
    || "local"
  ).split(",")[0].trim();
  const key = loginKey(`pin-change:${user.id}`, ip);
  const limit = checkLoginLimit(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "尝试次数过多，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const body = await req.json();
    const currentPin = String(body?.currentPin || "");
    const newPin = String(body?.newPin || "");
    const updated = changeStudentPin(user.id, currentPin, newPin);
    clearLoginFailures(key);

    const response = NextResponse.json({ ok: true, user: updated });
    response.cookies.set(SESSION_COOKIE, createSessionToken(updated.id), {
      httpOnly: true,
      sameSite: "strict",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 604800,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改 PIN 失败";
    if (message === "当前 PIN 不正确") recordLoginFailure(key);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
