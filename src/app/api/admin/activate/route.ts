import { NextRequest, NextResponse } from "next/server";
import { activateInvitedAdmin, AdminInvitationError } from "@/lib/admin-invitation";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "请在官方网站完成验证" }, { status: 403 });
  try {
    const parsed = new URL(origin);
    const requestHost = req.headers.get("host") || req.nextUrl.host;
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.host !== requestHost) {
      return NextResponse.json({ error: "验证来源无效" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "验证来源无效" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "请求格式无效" }, { status: 415 });
  }
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 1500) {
      return NextResponse.json({ error: "请求内容过长" }, { status: 413 });
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const token = typeof data.token === "string" ? data.token : "";
    const pin = typeof data.pin === "string" ? data.pin : "";
    const confirm = typeof data.confirm === "string" ? data.confirm : "";
    if (pin !== confirm) return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
    const admin = activateInvitedAdmin(token, pin);
    const result = NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
    result.cookies.set(SESSION_COOKIE, createSessionToken(admin.id, 8 * 3600), {
      httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 8 * 3600,
    });
    return result;
  } catch (e) {
    if (e instanceof AdminInvitationError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof SyntaxError) return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
    console.error("admin_invitation_activation_error", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({ error: "暂时无法完成管理员设置" }, { status: 500 });
  }
}
