import { NextRequest, NextResponse } from "next/server";
import { userFromRequest } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { diagnosticReportPdfResponse } from "@/lib/diagnostic-report-pdf-response";
import { getExamEntitlementForAttempt, getExamEntitlementSummary, isCommerceExamUser } from "@/lib/exam-entitlement-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const user = userFromRequest(request);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { attemptId } = await params;
  const report = buildDiagnosticReport(user, attemptId);
  if (!report) return NextResponse.json({ error: "报告不存在或无权访问" }, { status: 404 });
  if (isCommerceExamUser(user.id)) {
    getExamEntitlementSummary(user.id);
    if (!getExamEntitlementForAttempt(user.id, report.exam.id, attemptId)) {
      return NextResponse.json({ error: "该报告没有对应的已完成模拟考试权益记录" }, { status: 404 });
    }
  }
  return diagnosticReportPdfResponse(
    request,
    "/report/" + encodeURIComponent(attemptId),
    report.meta.reportId + "-print-white.pdf",
  );
}
