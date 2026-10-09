import { NextRequest, NextResponse } from "next/server";
import { createMiniappWechatSessionToken, userFromSessionToken } from "@/lib/auth";
import { classifyWechatCode2SessionError } from "@/lib/wechat-miniapp-failure";

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
    if (!response.ok) {
      console.warn(JSON.stringify({ event:"miniapp_wechat_upstream_http", httpStatus:response.status }));
      return NextResponse.json({ error:"微信登录服务暂不可用", reason:"upstream_http" }, { status:502 });
    }
    const data = await response.json() as { openid?: string; errcode?: number };
    if (!data.openid || data.errcode) {
      const numericCode = Number.isSafeInteger(data.errcode) ? Number(data.errcode) : 0;
      const issue = classifyWechatCode2SessionError(numericCode);
      // Do not log AppID, code, AppSecret, OpenID, session_key, or upstream error strings.
      console.warn(JSON.stringify({ event:"miniapp_wechat_code2session_rejected", errcode:numericCode, reason:issue.reason }));
      return NextResponse.json({ error:issue.publicMessage, reason:issue.reason }, { status:issue.status });
    }
    const accessToken = createMiniappWechatSessionToken(data.openid);
    return NextResponse.json({ ok: true, user: userFromSessionToken(accessToken), accessToken });
  } catch {
    console.warn(JSON.stringify({ event:"miniapp_wechat_upstream_exception", reason:"transport_or_parse" }));
    return NextResponse.json({ error:"微信登录服务暂不可用", reason:"upstream_exception" }, { status:502 });
  }
}
