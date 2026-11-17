import {NextRequest,NextResponse} from "next/server";
import {loadQuestionBank} from "@/lib/question-bank";
import {platformAdminPrincipal} from "@/lib/platform-admin-principal";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 if(!platformAdminPrincipal(req.cookies))
  return NextResponse.json({error:"无管理员权限"},{status:403,headers:{"Cache-Control":"no-store"}});
 try{return NextResponse.json({questions:loadQuestionBank()},{headers:{"Cache-Control":"private, no-store"}})}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load bank"},{status:500})}
}
