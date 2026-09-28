"use client";

import ReportDownloadButton from "@/components/ReportDownloadButton";

export default function DiagnosticReportActions({attemptId,pdfHref}:{attemptId:string;pdfHref?:string}){
  const href=pdfHref||`/api/reports/${encodeURIComponent(attemptId)}/pdf`;
  return <div className="diagnostic-actions"><button className="secondary" type="button" onClick={()=>window.print()}>浏览器打印</button><ReportDownloadButton className="primary" href={href} label="下载专业 PDF"/></div>;
}
