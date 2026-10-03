import {NextRequest,NextResponse} from "next/server";
import {authenticateOrCreateWechatParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {wechatUserInfo,WECHAT_CALLBACK_ORIGIN,WECHAT_STATE_COOKIE} from "@/lib/wechat-parent-auth";

export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get("code")||"",state=req.nextUrl.searchParams.get("state")||"",expected=req.cookies.get(WECHAT_STATE_COOKIE)?.value||"";
 if(!code||!state||!expected||state!==expected)return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=state_error`);
 try{
  const info=await wechatUserInfo(code),u=authenticateOrCreateWechatParent(info),r=NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent`);
  r.cookies.set(PARENT_SESSION_COOKIE,createParentSessionToken(u.id),{httpOnly:true,sameSite:"strict",secure:true,path:"/",domain:".socthink.cn",maxAge:604800});
  r.cookies.delete({name:WECHAT_STATE_COOKIE,path:"/",domain:".socthink.cn"});return r;
 }catch{return NextResponse.redirect(`${WECHAT_CALLBACK_ORIGIN}/parent/login?wechat=failed`)}
}
