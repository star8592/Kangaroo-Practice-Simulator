import { NextRequest, NextResponse } from "next/server";
import { createMiniappWechatSessionToken, userFromSessionToken } from "@/lib/auth";

// Mini-program AppID/AppSecret are NOT the Official Account or Open Platform credentials.
export async function POST(req: NextRequest) {
  const appid = process.env.WECHAT_MINIAPP_APPID?.trim();
  const secret = process.env.WECHAT_MINIAPP_SECRET?.trim();
  if (!appid || !secret) return NextResponse.json({ error: "微信小程序登录尚未配置" }, { status: 503 });
  let code: string;
  try {
    const body = await req.json();
    code = String(body?.code || "");
    if (!/^[a-zA-Z0-9_-]{8,256}$/.test(code)) throw new Error("invalid code");
  } catch { return NextResponse.json({ error: "微信登录凭证无效" }, { status: 400 }); }
  try {
    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.searchParams.set("appid", appid);
    url.searchParams.set("secret", secret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("wechat unavailable");
    const data = await response.json() as { openid?: string; errcode?: number };
    if (!data.openid || data.errcode) return NextResponse.json({ error: "微信身份验证失败，请重试" }, { status: 401 });
    const accessToken = createMiniappWechatSessionToken(data.openid);
    return NextResponse.json({ ok: true, user: userFromSessionToken(accessToken), accessToken });
  } catch { return NextResponse.json({ error: "微信登录服务暂不可用" }, { status: 502 }); }
}
