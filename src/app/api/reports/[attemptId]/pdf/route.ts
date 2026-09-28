import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { renderDiagnosticReportHtml } from "@/lib/diagnostic-report-html";
import { renderDiagnosticReportPdfFromHtml } from "@/lib/diagnostic-report-pdf";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  const user=userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if(!user)return NextResponse.json({error:"请先登录"},{status:401});
  const {attemptId}=await params;
  const report=buildDiagnosticReport(user,attemptId);
  if(!report)return NextResponse.json({error:"报告不存在或无权访问"},{status:404});
  try{
    const html=renderDiagnosticReportHtml(report);
    const pdf=renderDiagnosticReportPdfFromHtml(html);
    return new NextResponse(pdf,{headers:{"content-type":"application/pdf","content-disposition":`attachment; filename="${report.meta.reportId}.pdf"`,"cache-control":"private, no-store"}});
  }catch(e){
    return NextResponse.json({error:"PDF 生成失败",detail:e instanceof Error?e.message:String(e)},{status:500});
  }
}
