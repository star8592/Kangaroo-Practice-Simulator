import {NextRequest,NextResponse} from "next/server";
import {allowAuthAction} from "@/lib/auth-action-limit";
import {cancelChallenge,issueChallenge,newCode} from "@/lib/auth-challenges";
import {authEmailStatus,sendAuthCode} from "@/lib/auth-email";
import {parentByEmail,validEmail} from "@/lib/parent-auth";

export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=String(b?.email||"").trim().toLowerCase();
  if(!validEmail(email))return NextResponse.json({ok:true});
  const status=authEmailStatus();if(!status.enabled||(process.env.NODE_ENV==="production"&&!status.productionReady))return NextResponse.json({error:"邮箱验证服务暂未开放"},{status:503});
  const ip=(req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"local").split(",")[0].trim();
  const lim=allowAuthAction("forgot:"+ip+"|"+email,5,60*60*1000);if(!lim.allowed)return NextResponse.json({ok:true});
  if(parentByEmail(email)){
    const code=newCode();issueChallenge({purpose:"reset-password",email,code});
    try{await sendAuthCode({to:email,code,kind:"reset-password"})}catch{cancelChallenge("reset-password",email);return NextResponse.json({error:"邮件发送失败，请稍后再试"},{status:503})}
  }
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:true})}
}
