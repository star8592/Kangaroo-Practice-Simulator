import { NextRequest, NextResponse } from "next/server";
import {
  authenticateOrCreateWechatParent,
  createParentSessionToken,
  PARENT_SESSION_COOKIE,
} from "@/lib/parent-auth";
import {
  WECHAT_CALLBACK_ORIGIN,
  WECHAT_STATE_COOKIE,
  wechatUserInfo,
} from "@/lib/wechat-parent-auth";
import {
  completeWechatQrLogin,
  pendingWechatQrState,
} from "@/lib/wechat-qr-login";

function mobileResultPage(ok: boolean, message: string) {
  const title = ok ? "扫码成功" : "扫码失败";
  const safeMessage = message.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));

  return new NextResponse(
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a"><main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section style="max-width:420px;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:32px;text-align:center;box-shadow:0 18px 50px rgba(15,23,42,.08)"><div style="font-size:48px">${ok ? "✓" : "!"}</div><h1 style="margin:12px 0 8px;font-size:24px">${title}</h1><p style="margin:0;color:#64748b;line-height:1.8">${safeMessage}</p></section></main></body></html>`,
    {
      status: ok ? 200 : 400,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const qrFlow = /^wqs_[0-9a-f]{48}$/.test(state);

  if (!code || !state) {
    return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=state_error`);
  }

  if (qrFlow) {
    if (!pendingWechatQrState(state)) {
      return mobileResultPage(false, "二维码已过期，请回到电脑重新生成后再扫码。");
    }
  } else {
    const expected = req.cookies.get(WECHAT_STATE_COOKIE)?.value || "";
    if (!expected || state !== expected) {
      return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=state_error`);
    }
  }

  try {
    const info = await wechatUserInfo(code);
    const user = authenticateOrCreateWechatParent(info);

    if (qrFlow) {
      if (!completeWechatQrLogin(state, user.id)) {
        return mobileResultPage(false, "二维码已失效，请回到电脑重新生成。");
      }
      return mobileResultPage(true, "电脑端正在自动完成登录。你可以关闭此页面并返回电脑继续使用。");
    }

    const response = NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent`);
    response.cookies.set(PARENT_SESSION_COOKIE, createParentSessionToken(user.id), {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      domain: ".socthink.cn",
      maxAge: 604800,
    });
    response.cookies.delete({ name: WECHAT_STATE_COOKIE, path: "/", domain: ".socthink.cn" });
    return response;
  } catch {
    if (qrFlow) return mobileResultPage(false, "微信授权失败，请回到电脑重新扫码。");
    return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=failed`);
  }
}
