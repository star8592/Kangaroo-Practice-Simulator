import crypto from "node:crypto";

export const WECHAT_STATE_COOKIE = "socthink_parent_wechat_state";
export const WECHAT_CALLBACK_ORIGIN = (process.env.WECHAT_CALLBACK_ORIGIN || "https://socthink.cn").replace(/\/$/, "");

export type WechatLoginMode = "website" | "official_account";

export function wechatLoginMode(): WechatLoginMode {
  const raw = (process.env.WECHAT_LOGIN_MODE || "official_account").trim().toLowerCase();
  if (raw === "official_account" || raw === "service_account" || raw === "mp") return "official_account";
  return "website";
}

function wechatCredentials(mode: WechatLoginMode) {
  const appid = (mode === "website" ? process.env.WECHAT_WEBSITE_APPID : process.env.WECHAT_OPEN_APPID)?.trim();
  const secret = (mode === "website" ? process.env.WECHAT_WEBSITE_SECRET : process.env.WECHAT_OPEN_SECRET)?.trim();
  return { appid, secret };
}

export function wechatConfigured(mode: WechatLoginMode = wechatLoginMode()) {
  const { appid, secret } = wechatCredentials(mode);
  return Boolean(appid && secret);
}

export function newWechatState() {
  return crypto.randomBytes(24).toString("hex");
}

export function wechatAuthorizeUrl(state: string, forcedMode?: WechatLoginMode) {
  const mode = forcedMode || wechatLoginMode();
  const { appid } = wechatCredentials(mode);
  if (!appid) throw new Error("微信登录尚未配置");

  const redirect = encodeURIComponent(`${WECHAT_CALLBACK_ORIGIN}/api/auth/parent/wechat/callback`);

  if (mode === "official_account") {
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appid)}&redirect_uri=${redirect}&response_type=code&scope=snsapi_base&state=${encodeURIComponent(state)}#wechat_redirect`;
  }

  return `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(appid)}&redirect_uri=${redirect}&response_type=code&scope=snsapi_login&state=${encodeURIComponent(state)}#wechat_redirect`;
}

export async function wechatUserInfo(code: string, forcedMode?: WechatLoginMode) {
  const mode = forcedMode || wechatLoginMode();
  const { appid, secret } = wechatCredentials(mode);
  if (!appid || !secret) throw new Error("微信登录尚未配置");

  const tokenUrl = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
  tokenUrl.search = new URLSearchParams({
    appid,
    secret,
    code,
    grant_type: "authorization_code",
  }).toString();

  const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
  const token = await tokenResponse.json() as Record<string, unknown>;
  if (!tokenResponse.ok || token.errcode || !token.access_token || !token.openid) {
    // Only error codes and transport status may be logged: the request URL
    // contains AppSecret and the one-time OAuth code.
    const errcode = Number.isSafeInteger(token.errcode) ? token.errcode : null;
    console.warn("[wechat-auth] oauth_token_exchange_failed", {
      mode, upstreamStatus: tokenResponse.status, upstreamErrcode: errcode,
    });
    throw new Error("微信授权失败");
  }

  const tokenScope=String(token.scope||"");
  if (!tokenScope.includes("snsapi_userinfo") && !tokenScope.includes("snsapi_login")) {
    return {
      wechatId: String(token.unionid || token.openid),
      openId: String(token.openid),
      name: "微信用户",
    };
  }
  const infoUrl = new URL("https://api.weixin.qq.com/sns/userinfo");
  infoUrl.search = new URLSearchParams({
    access_token: String(token.access_token),
    openid: String(token.openid),
    lang: "zh_CN",
  }).toString();

  const infoResponse = await fetch(infoUrl, { cache: "no-store" });
  const info = await infoResponse.json() as Record<string, unknown>;
  if (!infoResponse.ok || info.errcode || !info.openid) {
    const errcode = Number.isSafeInteger(info.errcode) ? info.errcode : null;
    console.warn("[wechat-auth] oauth_userinfo_failed", {
      mode, upstreamStatus: infoResponse.status, upstreamErrcode: errcode,
    });
    throw new Error("微信用户信息获取失败");
  }

  return {
    wechatId: String(info.unionid || info.openid),
    openId: String(info.openid),
    name: String(info.nickname || "微信家长"),
    avatarUrl: typeof info.headimgurl === "string" ? info.headimgurl : undefined,
  };
}
