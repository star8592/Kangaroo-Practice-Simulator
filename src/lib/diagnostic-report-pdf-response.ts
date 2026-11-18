import { NextRequest, NextResponse } from "next/server";
import { renderDiagnosticReportPdfFromHtml } from "@/lib/diagnostic-report-pdf";
import {embedLocalReportImages} from "@/lib/diagnostic-report-embed-assets";

function internalOrigin() {
  return process.env.PDF_INTERNAL_ORIGIN?.trim() || `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`;
}

export async function diagnosticReportPdfResponse(
  req: NextRequest,
  pagePath: string,
  filename: string,
) {
  try {
    const pageUrl = new URL(pagePath, internalOrigin());
    const page = await fetch(pageUrl, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        "x-forwarded-host": req.headers.get("host") || "socthink.cn",
        "x-forwarded-proto": "https",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!page.ok) throw new Error(`report page ${page.status}`);
    // Private PDF snapshots must use the exact locally held source pixels.
    // Relative /local-assets URLs would be broken in a file:// renderer.
    const pdf = renderDiagnosticReportPdfFromHtml(embedLocalReportImages(await page.text()));
    return new NextResponse(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "PDF 生成失败", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
