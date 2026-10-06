import { NextRequest, NextResponse } from "next/server";
import { consumeWechatQrLogin, pollWechatQrLogin } from "@/lib/wechat-qr-login";
import { createParentSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ticket = req.nextUrl.searchParams.get("ticket")?.trim() || "";
  if (!/^wqt_[0-9a-f]{48}$/.test(ticket)) {
    return NextResponse.json({ status: "expired" }, { status: 400 });
  }

  const status = pollWechatQrLogin(ticket);
  if (status.status !== "authenticated") {
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }

  const consumed = consumeWechatQrLogin(ticket);
  if (!consumed) {
    return NextResponse.json(
      { status: "expired" },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const response = NextResponse.json(
    { status: "authenticated" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
  response.cookies.set(PARENT_SESSION_COOKIE, createParentSessionToken(consumed.parentId), {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    domain: ".socthink.cn",
    maxAge: 604800,
  });
  return response;
}
