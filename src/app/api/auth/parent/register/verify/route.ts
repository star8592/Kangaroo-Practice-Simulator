import {NextRequest,NextResponse} from "next/server";
import {verifyChallenge} from "@/lib/auth-challenges";
import {createParent,createParentSessionToken,PARENT_SESSION_COOKIE} from "@/lib/parent-auth";

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=String(b?.email||"").trim().toLowerCase(),code=String(b?.code||"").trim();
  if(!/^\d{6}$/.test(code))return NextResponse.json({error:"请输入6位验证码"},{status:400});
  const c=verifyChallenge("register",email,code),p=c.payload;
  if(!p?.name||!p.passwordHash||!p.termsAcceptedAt||!p.guardianConfirmedAt)throw new Error("注册信息已失效，请重新注册");
  const user=createParent({email,name:p.name,passwordHash:p.passwordHash,termsAcceptedAt:p.termsAcceptedAt,guardianConfirmedAt:p.guardianConfirmedAt});
  const r=NextResponse.json({ok:true,user},{status:201});
  r.cookies.set(PARENT_SESSION_COOKIE,createParentSessionToken(user.id),{httpOnly:true,sameSite:"strict",secure:req.nextUrl.protocol==="https:",path:"/",maxAge:604800});
  return r;
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"邮箱验证失败"},{status:400})}
}
