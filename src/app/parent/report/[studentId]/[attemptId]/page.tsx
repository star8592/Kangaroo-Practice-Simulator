import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DiagnosticReportActions from "@/components/DiagnosticReportActions";
import DiagnosticReportView from "@/components/DiagnosticReportView";
import { publicUserById } from "@/lib/auth";
import { buildDiagnosticReport } from "@/lib/diagnostic-report";
import { DIAGNOSTIC_REPORT_MOBILE_CSS } from "@/lib/diagnostic-report-mobile-style";
import { DIAGNOSTIC_REPORT_CSS } from "@/lib/diagnostic-report-style";
import { familyOwnsStudent } from "@/lib/family-store";
import { parentFromSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parent-auth";

export default async function ParentDiagnosticReportPage({params}:{params:Promise<{studentId:string;attemptId:string}>}){
  const store=await cookies();
  const parent=parentFromSessionToken(store.get(PARENT_SESSION_COOKIE)?.value);
  if(!parent)redirect("/parent/login");
  const {studentId,attemptId}=await params;
  if(!familyOwnsStudent(parent.id,studentId))notFound();
  const student=publicUserById(studentId);
  if(!student)notFound();
  const report=buildDiagnosticReport(student,attemptId);
  if(!report)notFound();
  const pdfHref=`/api/parent/reports/${encodeURIComponent(studentId)}/${encodeURIComponent(attemptId)}/pdf`;
  return <><style dangerouslySetInnerHTML={{__html:`${DIAGNOSTIC_REPORT_CSS}\n${DIAGNOSTIC_REPORT_MOBILE_CSS}`}}/><DiagnosticReportActions attemptId={attemptId} pdfHref={pdfHref}/><DiagnosticReportView report={report}/></>;
}
