import {NextRequest,NextResponse} from "next/server";
import {authenticate,createSessionToken,SESSION_COOKIE} from "@/lib/auth";
import {checkLoginLimit,clearLoginFailures,loginKey,recordLoginFailure} from "@/lib/login-rate-limit";
export async function POST(req:NextRequest){
 try{
  const b=await req.json(),account=String(b?.username||b?.candidateNo||""),pin=String(b?.pin||"");
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim(),key=loginKey(account,ip),limit=checkLoginLimit(key);
  if(!limit.allowed)return NextResponse.json({error:"尝试次数过多，请稍后再试"},{status:429,headers:{"Retry-After":String(limit.retryAfterSeconds)}});
  const u=authenticate(account,pin);
  if(!u){const failed=recordLoginFailure(key);if(failed.blockedUntil>Date.now())return NextResponse.json({error:"尝试次数过多，请稍后再试"},{status:429,headers:{"Retry-After":String(Math.ceil((failed.blockedUntil-Date.now())/1000))}});return NextResponse.json({error:"账号、准考证号或 PIN 不正确"},{status:401})}
  clearLoginFailures(key);
  const r=NextResponse.json({ok:true,user:u});r.cookies.set(SESSION_COOKIE,createSessionToken(u.id),{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:604800});return r;
 }catch{return NextResponse.json({error:"登录失败"},{status:400})}
}
