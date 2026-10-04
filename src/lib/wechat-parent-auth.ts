import crypto from "node:crypto";

export const WECHAT_STATE_COOKIE="socthink_parent_wechat_state";
export const WECHAT_CALLBACK_ORIGIN=(process.env.WECHAT_CALLBACK_ORIGIN||"https://www.socthink.cn").replace(/\/$/,"");
export const WECHAT_LOGIN_MODE=(process.env.WECHAT_LOGIN_MODE||"website").trim().toLowerCase();

export function wechatConfigured(){return Boolean(process.env.WECHAT_OPEN_APPID?.trim()&&process.env.WECHAT_OPEN_SECRET?.trim())}
export function newWechatState(){return crypto.randomBytes(24).toString("hex")}
export function wechatAuthorizeUrl(state:string){
 const appid=process.env.WECHAT_OPEN_APPID?.trim();if(!appid)throw new Error("微信登录尚未配置");
 const redirect=encodeURIComponent(`${WECHAT_CALLBACK_ORIGIN}/api/auth/parent/wechat/callback`);
 if(WECHAT_LOGIN_MODE==="official_account"){
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${encodeURIComponent(appid)}&redirect_uri=${redirect}&response_type=code&scope=snsapi_userinfo&state=${encodeURIComponent(state)}#wechat_redirect`;
 }
 return `https://open.weixin.qq.com/connect/qrconnect?appid=${encodeURIComponent(appid)}&redirect_uri=${redirect}&response_type=code&scope=snsapi_login&state=${encodeURIComponent(state)}#wechat_redirect`;
}
export async function wechatUserInfo(code:string){
 const appid=process.env.WECHAT_OPEN_APPID?.trim(),secret=process.env.WECHAT_OPEN_SECRET?.trim();
 if(!appid||!secret)throw new Error("微信登录尚未配置");
 const tokenUrl=new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
 tokenUrl.search=new URLSearchParams({appid,secret,code,grant_type:"authorization_code"}).toString();
 const token=await fetch(tokenUrl,{cache:"no-store"}).then(r=>r.json()) as Record<string,unknown>;
 if(token.errcode||!token.access_token||!token.openid)throw new Error("微信授权失败");
 const infoUrl=new URL("https://api.weixin.qq.com/sns/userinfo");
 infoUrl.search=new URLSearchParams({access_token:String(token.access_token),openid:String(token.openid),lang:"zh_CN"}).toString();
 const info=await fetch(infoUrl,{cache:"no-store"}).then(r=>r.json()) as Record<string,unknown>;
 if(info.errcode||!info.openid)throw new Error("微信用户信息获取失败");
 return {wechatId:String(info.unionid||info.openid),openId:String(info.openid),name:String(info.nickname||"微信家长"),avatarUrl:typeof info.headimgurl==="string"?info.headimgurl:undefined};
}
