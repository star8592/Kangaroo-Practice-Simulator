import {NextRequest,NextResponse} from "next/server";
import {PARENT_SESSION_COOKIE,parentFromSessionToken,officialWechatOpenIdForSession} from "@/lib/parent-auth";
import {jsapiReadiness} from "@/lib/wechat-jsapi-payment";

export const runtime="nodejs";
export const dynamic="force-dynamic";
/** This route never returns OpenID, AppID, merchant id or signing keys.
 * It does not create an order or claim that WeChat has approved JSAPI.
 */
export async function GET(req:NextRequest){
  const headers={"Cache-Control":"private, no-store, max-age=0","Vary":"Cookie"};
  const token=req.cookies.get(PARENT_SESSION_COOKIE)?.value;
  const user=parentFromSessionToken(token);
  if(!user?.active||!(user.wechatId||user.wechatOpenId))
    return NextResponse.json({code:"WECHAT_LOGIN_REQUIRED"},{status:401,headers});
  const readiness=jsapiReadiness({
    merchantAppId:process.env.WECHAT_PAY_APPID,
    officialAppId:process.env.WECHAT_OPEN_APPID,
    officialOpenId:officialWechatOpenIdForSession(token)??undefined,
    approved:process.env.SOCTHINK_WECHAT_JSAPI_APPROVED==="1",
    enabled:process.env.SOCTHINK_WECHAT_JSAPI_ENABLED==="1",
  });
  return NextResponse.json({
    paymentMethod:"JSAPI",configuredForCurrentAccount:readiness.ready,
    code:readiness.code,checkoutAvailable:false,
    note:"当前仅核对公众号AppID与当前微信会话，不会发起真实付款。"
  },{headers});
}
