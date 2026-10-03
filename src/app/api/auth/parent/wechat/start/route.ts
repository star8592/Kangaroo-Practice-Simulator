import {NextRequest,NextResponse} from "next/server";
import {newWechatState,wechatAuthorizeUrl,wechatConfigured,WECHAT_STATE_COOKIE} from "@/lib/wechat-parent-auth";

export async function GET(req:NextRequest){
 if(!wechatConfigured())return NextResponse.redirect(new URL("/parent/login?wechat=unavailable",req.url));
 const state=newWechatState(),r=NextResponse.redirect(wechatAuthorizeUrl(state));
 r.cookies.set(WECHAT_STATE_COOKIE,state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",domain:".socthink.cn",maxAge:600});
 return r;
}
