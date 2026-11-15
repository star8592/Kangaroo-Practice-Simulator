import {NextRequest,NextResponse} from "next/server";
import {wechatAuthorizeUrl,wechatConfigured,WECHAT_CALLBACK_ORIGIN} from "@/lib/wechat-parent-auth";
import {issueWechatMobileFlow,WECHAT_MOBILE_FLOW_COOKIE,safeReturnPath} from "@/lib/wechat-mobile-oauth-state";

export const dynamic="force-dynamic";

/** This endpoint is exclusively the WeChat-in-app Official Account flow.
 * The website QR flow already has its own /wechat/qr route and credentials.
 * Never silently switch an in-app OAuth code to the website AppID. */
export async function GET(req:NextRequest){
 if(!wechatConfigured("official_account"))
  return NextResponse.redirect(WECHAT_CALLBACK_ORIGIN+"/login?wechat=unavailable");
 const destination=safeReturnPath(req.nextUrl.searchParams.get("next"));
 const issued=issueWechatMobileFlow(
  req.cookies.get(WECHAT_MOBILE_FLOW_COOKIE)?.value,destination);
 const response=NextResponse.redirect(wechatAuthorizeUrl(issued.state,"official_account"));
 response.headers.set("Cache-Control","no-store, max-age=0");
 response.cookies.set(WECHAT_MOBILE_FLOW_COOKIE,issued.cookie,{
  httpOnly:true,secure:true,sameSite:"lax",path:"/",domain:".socthink.cn",maxAge:600,
 });
 console.info("[wechat-auth] mobile_oauth_start",{flow:"official-account-mobile"});
 return response;
}
