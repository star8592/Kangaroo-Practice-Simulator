import { NextRequest, NextResponse } from "next/server";
import { createFamilyPracticeSessionToken, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import {
  authenticateOrCreateWechatParent,
  createParentSessionToken,
  PARENT_SESSION_COOKIE,
  PARENT_SESSION_TTL_SECONDS,
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
import {validateWechatMobileFlow,WECHAT_MOBILE_FLOW_COOKIE,safeReturnPath}
 from "@/lib/wechat-mobile-oauth-state";

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
  const mobileFlow=qrFlow?null:validateWechatMobileFlow(
    req.cookies.get(WECHAT_MOBILE_FLOW_COOKIE)?.value,state);
  // Compat: requests initiated before this release used two single-flow cookies.
  const legacyNext=req.cookies.get("socthink_parent_wechat_next")?.value;
  const returnPath=mobileFlow?.next||safeReturnPath(legacyNext);
  function completeCookie(response:NextResponse){
    if(mobileFlow){
      if(mobileFlow.remaining)
        response.cookies.set(WECHAT_MOBILE_FLOW_COOKIE,mobileFlow.remaining,{
          httpOnly:true,secure:true,sameSite:"lax",path:"/",
          domain:".socthink.cn",maxAge:600,
        });
      else response.cookies.delete({
        name:WECHAT_MOBILE_FLOW_COOKIE,path:"/",domain:".socthink.cn",
      });
    }
    return response;
  }
  const failedRedirect=(reason:"state_error"|"failed")=>
    completeCookie(NextResponse.redirect(WECHAT_CALLBACK_ORIGIN+
      "/login?wechat="+reason+"&next="+encodeURIComponent(returnPath)));

    if (!code || !state) {
    console.warn("[wechat-auth] callback_missing_oauth_parameters", {flow:qrFlow?"website-qr":"official-account-mobile"});
    return failedRedirect("state_error");
  }

  if (qrFlow) {
    if (!pendingWechatQrState(state)) {
      return mobileResultPage(false, "二维码已过期，请回到电脑重新生成后再扫码。");
    }
  } else {
    const expected = req.cookies.get(WECHAT_STATE_COOKIE)?.value || "";
    if (!mobileFlow && (!expected || state !== expected)) {
      console.warn("[wechat-auth] mobile_oauth_state_mismatch", {flow:"official-account-mobile"});
      return failedRedirect("state_error");
    }
  }

  try {
    const info = await wechatUserInfo(code, qrFlow ? "website" : "official_account");
    const user = authenticateOrCreateWechatParent(info);

    if (qrFlow) {
      if (!completeWechatQrLogin(state, user.id)) {
        return mobileResultPage(false, "二维码已失效，请回到电脑重新生成。");
      }
      console.info("[wechat-auth] callback_success", {
        flow:"website-qr", hasUnionId:Boolean(info.unionId),
      });
      return mobileResultPage(true, "电脑端正在自动完成登录。你可以关闭此页面并返回电脑继续使用。");
    }

    const response = NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}${returnPath}`);
    response.cookies.set(PARENT_SESSION_COOKIE, createParentSessionToken(user.id), {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      domain: ".socthink.cn",
      maxAge: PARENT_SESSION_TTL_SECONDS,
    });
    if (!userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
      response.cookies.set(SESSION_COOKIE, createFamilyPracticeSessionToken(user.id), {
        httpOnly: true, sameSite: "lax", secure: true, path: "/", domain: ".socthink.cn", maxAge: 604800,
      });
    }
    response.cookies.delete({ name: WECHAT_STATE_COOKIE, path: "/", domain: ".socthink.cn" });
    response.cookies.delete({ name: "socthink_parent_wechat_next", path: "/", domain: ".socthink.cn" });
    console.info("[wechat-auth] callback_success", {
      flow:"official-account-mobile", hasUnionId:Boolean(info.unionId),
    });
    return completeCookie(response);
  } catch (error) {
    // Never log OAuth code, token, AppSecret, OpenID, user ID or full URL.
    console.warn("[wechat-auth] callback_failed", {
      flow:qrFlow?"website-qr":"official-account-mobile",
      errorType:error instanceof Error?error.name:"unknown",
    });
    if (qrFlow) return mobileResultPage(false, "微信授权失败，请回到电脑重新扫码。");
    return failedRedirect("failed");
  }
}
