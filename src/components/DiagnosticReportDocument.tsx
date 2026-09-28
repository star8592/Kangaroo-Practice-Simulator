import DiagnosticReportActions from "@/components/DiagnosticReportActions";
import DiagnosticReportView from "@/components/DiagnosticReportView";
import type { DiagnosticReport } from "@/lib/diagnostic-report";
import { DIAGNOSTIC_REPORT_MOBILE_CSS } from "@/lib/diagnostic-report-mobile-style";
import { DIAGNOSTIC_REPORT_CSS } from "@/lib/diagnostic-report-style";

export default function DiagnosticReportDocument({
  report,
  attemptId,
  pdfHref,
}: {
  report: DiagnosticReport;
  attemptId: string;
  pdfHref?: string;
}) {
  return <>
    <style dangerouslySetInnerHTML={{__html:`${DIAGNOSTIC_REPORT_CSS}\n${DIAGNOSTIC_REPORT_MOBILE_CSS}`}} />
    <DiagnosticReportActions attemptId={attemptId} pdfHref={pdfHref} />
    <DiagnosticReportView report={report} />
  </>;
}
