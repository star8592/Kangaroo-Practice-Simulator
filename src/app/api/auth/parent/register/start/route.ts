import {NextRequest,NextResponse} from "next/server";
import {allowAuthAction} from "@/lib/auth-action-limit";
import {cancelChallenge,issueChallenge,newCode} from "@/lib/auth-challenges";
import {authEmailStatus,sendAuthCode} from "@/lib/auth-email";
import {hashPassword,parentByEmail,validEmail,validatePassword} from "@/lib/parent-auth";

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=String(b?.email||"").trim().toLowerCase(),name=String(b?.name||"").trim(),password=String(b?.password||"");
  if(!validEmail(email)||!name||name.length>60)return NextResponse.json({error:"请填写有效邮箱和家长姓名"},{status:400});
  const pe=validatePassword(password);if(pe)return NextResponse.json({error:pe},{status:400});
  if(b?.acceptedTerms!==true||b?.guardianConfirmed!==true)return NextResponse.json({error:"请确认监护人身份并同意用户协议与隐私政策"},{status:400});
  if(parentByEmail(email))return NextResponse.json({error:"该邮箱已经注册，请直接登录"},{status:409});
  const status=authEmailStatus();if(!status.enabled||(process.env.NODE_ENV==="production"&&!status.productionReady))return NextResponse.json({error:"邮箱验证服务暂未开放"},{status:503});
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim();
  const lim=allowAuthAction("reg:"+ip+"|"+email,5,60*60*1000);if(!lim.allowed)return NextResponse.json({error:"验证码请求过于频繁"},{status:429,headers:{"Retry-After":String(lim.retryAfterSeconds)}});
  const code=newCode(),now=Date.now();
  issueChallenge({purpose:"register",email,code,payload:{name,passwordHash:hashPassword(password),termsAcceptedAt:now,guardianConfirmedAt:now}});
  try{await sendAuthCode({to:email,code,kind:"verify-email"})}catch(e){cancelChallenge("register",email);return NextResponse.json({error:e instanceof Error?e.message:"验证码发送失败"},{status:503})}
  return NextResponse.json({ok:true,expiresInSeconds:600,resendAfterSeconds:60});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"注册请求失败"},{status:400})}
}
