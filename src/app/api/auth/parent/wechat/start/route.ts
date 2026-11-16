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
 // Teachers need the verified cross-app UnionID to preserve their existing
 // desktop permissions. Keep ordinary parents on silent snsapi_base login;
 // teacher entry may require a one-time in-WeChat profile consent instead of
 // creating an unrelated teacher identity from an AppID-scoped OpenID.
 const teacherJourney=destination==="/workspace"||
   destination.startsWith("/admin/platform-authorizations")||
   destination.startsWith("/english/pronunciation/app/teacher/")||
   destination.startsWith("/english/vocabulary/app/teacher/");
 const profile=req.nextUrl.searchParams.get("profile")==="1"||teacherJourney;
 const response=NextResponse.redirect(wechatAuthorizeUrl(issued.state,"official_account",
  profile?"snsapi_userinfo":"snsapi_base"));
 response.headers.set("Cache-Control","no-store, max-age=0");
 response.cookies.set(WECHAT_MOBILE_FLOW_COOKIE,issued.cookie,{
  httpOnly:true,secure:true,sameSite:"lax",path:"/",domain:".socthink.cn",maxAge:600,
 });
 console.info("[wechat-auth] mobile_oauth_start",{flow:"official-account-mobile"});
 return response;
}
