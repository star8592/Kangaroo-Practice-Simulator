import {NextRequest,NextResponse} from "next/server";
import {newWechatState,wechatAuthorizeUrl,wechatConfigured,WECHAT_CALLBACK_ORIGIN,WECHAT_STATE_COOKIE} from "@/lib/wechat-parent-auth";
export const WECHAT_NEXT_COOKIE="socthink_parent_wechat_next";
export async function GET(req:NextRequest){
 if(!wechatConfigured())return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/login?wechat=unavailable`);
 const candidate=req.nextUrl.searchParams.get("next")||"/account";
 const next=candidate.startsWith("/")&&!candidate.startsWith("//")&&!candidate.includes("\\")?candidate.slice(0,1024):"/account";
 const state=newWechatState();
 const r=NextResponse.redirect(wechatAuthorizeUrl(state));
 const opts={httpOnly:true,secure:true,sameSite:"lax" as const,path:"/",domain:".socthink.cn",maxAge:600};
 r.cookies.set(WECHAT_STATE_COOKIE,state,opts);
 r.cookies.set(WECHAT_NEXT_COOKIE,next,opts);
 return r;
}
