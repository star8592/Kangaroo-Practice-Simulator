import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DiagnosticReportActions from "@/components/DiagnosticReportActions";
import DiagnosticReportView from "@/components/DiagnosticReportView";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { DIAGNOSTIC_REPORT_CSS } from "@/lib/diagnostic-report-style";

export default async function DiagnosticReportPage({params}:{params:Promise<{attemptId:string}>}){
  const store=await cookies();
  const user=userFromSessionToken(store.get(SESSION_COOKIE)?.value);
  if(!user)redirect("/login");
  const {attemptId}=await params;
  const report=buildDiagnosticReport(user,attemptId);
  if(!report)notFound();
  return <><style dangerouslySetInnerHTML={{__html:DIAGNOSTIC_REPORT_CSS}}/><DiagnosticReportActions attemptId={attemptId}/><DiagnosticReportView report={report}/></>;
}
