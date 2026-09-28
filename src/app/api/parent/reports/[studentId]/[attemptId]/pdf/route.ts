import { NextRequest, NextResponse } from "next/server";
import { publicUserById } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { renderDiagnosticReportHtml } from "@/lib/diagnostic-report-html";
import { renderDiagnosticReportPdfFromHtml } from "@/lib/diagnostic-report-pdf";
import { familyOwnsStudent } from "@/lib/family-store";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest,{params}:{params:Promise<{studentId:string;attemptId:string}>}){
  const parent=parentFromSessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
  if(!parent)return NextResponse.json({error:"请先登录家长账号"},{status:401});
  const {studentId,attemptId}=await params;
  if(!familyOwnsStudent(parent.id,studentId))return NextResponse.json({error:"无权访问该学生报告"},{status:403});
  const student=publicUserById(studentId);
  if(!student)return NextResponse.json({error:"学生不存在"},{status:404});
  const report=buildDiagnosticReport(student,attemptId);
  if(!report)return NextResponse.json({error:"报告不存在"},{status:404});
  try{
    const html=renderDiagnosticReportHtml(report);
    const pdf=renderDiagnosticReportPdfFromHtml(html);
    return new NextResponse(pdf,{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="${report.meta.reportId}.pdf"`,"cache-control":"private, no-store"}});
  }catch(e){
    return NextResponse.json({error:"PDF 生成失败",detail:e instanceof Error?e.message:String(e)},{status:500});
  }
}
