"use client";
import { useMemo, useState } from "react";
import type { SolutionBook } from "@/lib/solution-books";
import { solutionBookPageUrl, verifiedPagesForQuestion } from "@/lib/solution-books";
import type { DisplayLang } from "@/lib/display";

const UI = {
  zh: {
    launch: "查看原始中文解析",
    launchBook: "打开本年原始中文解析册",
    evidence: "原始资料证据",
    whole: "整本解析",
    verified: "本题已定位",
    unverified: "本题页码待校验",
    prev: "上一页",
    next: "下一页",
    page: "页",
    open: "打开高清原图",
    close: "收起解析",
  },
  en: {
    launch: "Open original Chinese solutions",
    launchBook: "Open this year’s original solution book",
    evidence: "Original source evidence",
    whole: "Full solution book",
    verified: "Question page verified",
    unverified: "Question page not yet verified",
    prev: "Previous",
    next: "Next",
    page: "Page",
    open: "Open full-size image",
    close: "Close",
  },
} as const;

export default function SolutionBookViewer({
  book, questionNo, lang,
}: {
  book: SolutionBook;
  questionNo?: number;
  lang: DisplayLang;
}) {
  const ui = UI[lang === "en" ? "en" : "zh"];
  const verified = useMemo(() => questionNo ? verifiedPagesForQuestion(book, questionNo) : [], [book, questionNo]);
  const initial = verified[0] ?? 1;
  const [open, setOpen] = useState(false);
  const pageKey = `${book.id}:${questionNo ?? "book"}:${initial}`;
  const [pageState, setPageState] = useState({ key: pageKey, page: initial });
  const page = pageState.key === pageKey ? pageState.page : initial;
  const updatePage = (next: number | ((current: number) => number)) => {
    setPageState((previous) => {
      const current = previous.key === pageKey ? previous.page : initial;
      const value = typeof next === "function" ? next(current) : next;
      return { key: pageKey, page: value };
    });
  };

  const url = solutionBookPageUrl(book, page);
  const label = lang === "en" ? book.labelEn : book.labelZh;
  const note = lang === "en" ? book.noteEn : book.noteZh;

  if (!open) return (
    <div className="solution-book-entry">
      <button className="solution-book-launch" onClick={() => setOpen(true)}>
        <span aria-hidden>📖</span>
        <div>
          <small>{ui.evidence} · {book.totalPages} {ui.page}</small>
          <strong>{questionNo ? ui.launch : ui.launchBook}</strong>
          <em>{questionNo ? (verified.length ? ui.verified : ui.unverified) : ui.whole}</em>
        </div>
        {questionNo&&<b>Q{questionNo}</b>}
      </button>
    </div>
  );

  return (
    <section className="solution-book-viewer">
      <header>
        <div><span aria-hidden>📖</span><div><small>{ui.evidence}</small><strong>{label}</strong></div></div>
        <button onClick={() => setOpen(false)}>{ui.close}</button>
      </header>
      <div className="solution-book-page">
        <a href={url} target="_blank" rel="noreferrer" title={ui.open}>
          <img src={url} alt={`${label} · ${ui.page} ${page}`} loading="lazy" />
        </a>
      </div>
      <div className="solution-book-controls">
        <button className="secondary-button" disabled={page <= 1} onClick={() => updatePage(p => Math.max(1, p - 1))}>{ui.prev}</button>
        <label>
          <span>{ui.page}</span>
          <input
            inputMode="numeric"
            value={page}
            onChange={e => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) updatePage(Math.max(1, Math.min(book.totalPages, Math.trunc(n) || 1)));
            }}
          />
          <span>/ {book.totalPages}</span>
        </label>
        <button className="secondary-button" disabled={page >= book.totalPages} onClick={() => updatePage(p => Math.min(book.totalPages, p + 1))}>{ui.next}</button>
        <a className="secondary-button solution-book-open" href={url} target="_blank" rel="noreferrer">{ui.open}</a>
      </div>
      <p className="solution-book-note">{verified.length ? `${ui.verified}: ${verified.join(", ")}` : (note || ui.whole)}</p>
    </section>
  );
}