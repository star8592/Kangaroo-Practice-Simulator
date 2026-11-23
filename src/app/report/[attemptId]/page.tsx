import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DiagnosticReportDocument from "@/components/DiagnosticReportDocument";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { getExamEntitlementForAttempt, getExamEntitlementSummary, isCommerceExamUser } from "@/lib/exam-entitlement-store";

export default async function DiagnosticReportPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const store = await cookies();
  const user = userFromSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  const { attemptId } = await params;
  const report = buildDiagnosticReport(user, attemptId);
  if (!report) notFound();
  if (isCommerceExamUser(user.id)) {
    getExamEntitlementSummary(user.id);
    if (!getExamEntitlementForAttempt(user.id, report.exam.id, attemptId)) notFound();
  }
  return <DiagnosticReportDocument report={report} attemptId={attemptId} />;
}
