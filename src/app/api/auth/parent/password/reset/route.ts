import {NextRequest,NextResponse} from "next/server";
import {verifyChallenge} from "@/lib/auth-challenges";
import {resetParentPassword,validatePassword} from "@/lib/parent-auth";
export async function POST(req:NextRequest){
 try{
  const b=await req.json(),email=String(b?.email||"").trim().toLowerCase(),code=String(b?.code||"").trim(),password=String(b?.password||"");
  if(!/^\d{6}$/.test(code))return NextResponse.json({error:"请输入6位验证码"},{status:400});
  const pe=validatePassword(password);if(pe)return NextResponse.json({error:pe},{status:400});
  verifyChallenge("reset-password",email,code);resetParentPassword(email,password);return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"重置密码失败"},{status:400})}
}
