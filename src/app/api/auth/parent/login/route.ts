import {NextRequest,NextResponse} from "next/server";
import {authenticateParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";
import {checkLoginLimit,clearLoginFailures,loginKey,recordLoginFailure} from "@/lib/login-rate-limit";

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=String(b?.email||""),password=String(b?.password||"");
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim(),key=loginKey(email,ip),limit=checkLoginLimit(key);
  if(!limit.allowed)return NextResponse.json({error:"尝试次数过多，请稍后再试"},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
  const u=authenticateParent(email,password);
  if(!u){const failed=recordLoginFailure(key);return NextResponse.json({error:"邮箱或密码不正确"},{status:failed.blockedUntil>Date.now()?429:401})}
  clearLoginFailures(key);
  const r=NextResponse.json({ok:true,user:u});r.cookies.set(PARENT_SESSION_COOKIE,createParentSessionToken(u.id),{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:604800});return r;
 }catch{return NextResponse.json({error:"登录失败"},{status:400})}
}
