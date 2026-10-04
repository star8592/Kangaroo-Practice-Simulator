import {NextResponse} from "next/server";
import {newWechatState,wechatAuthorizeUrl,wechatConfigured,WECHAT_CALLBACK_ORIGIN,WECHAT_STATE_COOKIE} from "@/lib/wechat-parent-auth";

export async function GET(){
 if(!wechatConfigured())return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=unavailable`);
 const state=newWechatState(),r=NextResponse.redirect(wechatAuthorizeUrl(state));
 r.cookies.set(WECHAT_STATE_COOKIE,state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",domain:".socthink.cn",maxAge:600});
 return r;
}
