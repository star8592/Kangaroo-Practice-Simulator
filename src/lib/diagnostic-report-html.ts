import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DiagnosticReportView from "@/components/DiagnosticReportView";
import type { DiagnosticReport } from "@/lib/diagnostic-report";
import { DIAGNOSTIC_REPORT_CSS } from "@/lib/diagnostic-report-style";

export function renderDiagnosticReportHtml(report: DiagnosticReport) {
  const body = renderToStaticMarkup(createElement(DiagnosticReportView, { report }));
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${report.meta.reportId}</title><style>${DIAGNOSTIC_REPORT_CSS}</style></head><body>${body}</body></html>`;
}
