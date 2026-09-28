import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { diagnosticReportPdfResponse } from "@/lib/diagnostic-report-pdf-response";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest,{params}:{params:Promise<{attemptId:string}>}){
  const user=userFromSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if(!user)return NextResponse.json({error:"请先登录"},{status:401});
  const {attemptId}=await params;
  const report=buildDiagnosticReport(user,attemptId);
  if(!report)return NextResponse.json({error:"报告不存在或无权访问"},{status:404});
  return diagnosticReportPdfResponse(
    req,
    `/report/${encodeURIComponent(attemptId)}`,
    `${report.meta.reportId}.pdf`,
  );
}
