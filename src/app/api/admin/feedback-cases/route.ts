import { NextRequest,NextResponse } from "next/server";
import {platformAdminPrincipal} from "@/lib/platform-admin-principal";
import {sameOriginMutation} from "@/lib/site-owner-bootstrap";
import { CASE_STATES, CaseTransitionError, updateFeedbackCase } from "@/lib/customer-feedback-workflow";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store"};
export async function PATCH(req:NextRequest) {
  const principal=platformAdminPrincipal(req.cookies);
  if (!principal) return NextResponse.json({error:"管理员身份验证失败"},{status:403,headers});
  if(!sameOriginMutation(req)) return NextResponse.json({error:"请求来源不符合要求"},{status:403,headers});
  if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return NextResponse.json({error:"请使用JSON"},{status:415,headers});
  try{
    const text=await req.text();
    if(Buffer.byteLength(text,"utf8")>1700)
      return NextResponse.json({error:"内容过长"},{status:413,headers});
    const body=JSON.parse(text) as Record<string,unknown>;
    if(typeof body.feedbackId!=="string" || typeof body.expectedVersion!=="number" ||
      typeof body.to!=="string" || !CASE_STATES.includes(body.to as typeof CASE_STATES[number]) ||
      typeof body.note!=="string" || (body.evidenceRef!==undefined && typeof body.evidenceRef!=="string")) {
      return NextResponse.json({error:"输入内容不完整"},{status:400,headers});
    }
    const item=updateFeedbackCase({
      feedbackId:body.feedbackId,expectedVersion:body.expectedVersion,
      to:body.to as typeof CASE_STATES[number],note:body.note,
      ...(typeof body.evidenceRef==="string"?{evidenceRef:body.evidenceRef}:{}),
      reviewerId:principal.actorId,
    });
    return NextResponse.json({ok:true,item},{headers});
  }catch(e){
    if(e instanceof CaseTransitionError)
      return NextResponse.json({error:e.message},{status:e.status,headers});
    if(e instanceof SyntaxError)
      return NextResponse.json({error:"内容不是有效JSON"},{status:400,headers});
    console.error("feedback_case_transition_failed",e instanceof Error?e.name:"unknown");
    return NextResponse.json({error:"保存失败，处理日志未更新"},{status:500,headers});
  }
}
