"use client";

import { useState } from "react";

type Props = {
  href: string;
  label?: string;
  className?: string;
};

function filenameFromDisposition(value: string | null, fallback: string) {
  if (!value) return fallback;
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8); } catch { return utf8; }
  }
  const plain = value.match(/filename="?([^";]+)"?/i)?.[1];
  return plain || fallback;
}

export default function ReportDownloadButton({ href, label = "下载 PDF", className = "secondary-button" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(href, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/pdf" },
      });
      if (!response.ok) {
        let message = `下载失败（${response.status}）`;
        try {
          const data = await response.json() as { error?: string; detail?: string };
          message = data.error || data.detail || message;
        } catch { /* response is not JSON */ }
        throw new Error(message);
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("PDF 文件为空");
      const fallback = `report-${Date.now()}.pdf`;
      const filename = filenameFromDisposition(response.headers.get("content-disposition"), fallback);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "下载失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="report-download-control">
      <button className={className} type="button" onClick={download} disabled={busy} title={error || undefined}>
        {busy ? "生成中…" : label}
      </button>
      {error && <small className="report-download-error" role="status">{error}</small>}
    </span>
  );
}
