"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReviewAttemptPayload } from "@/lib/review-attempt";
import MathVerificationBadge from "@/components/MathVerificationBadge";
import { conceptLabel, type DisplayLang } from "@/lib/display";
import { useSiteLanguage } from "@/lib/site-language";
import SmartSolutionPlayer from "@/components/SmartSolutionPlayer";
import SolutionBookViewer from "@/components/SolutionBookViewer";
import { hasExactQuestionMapping, solutionBookForExam } from "@/lib/solution-books";

type Attempt = ReviewAttemptPayload & { lang?: DisplayLang };

const UI = {
  zh: {
    eyebrow: "错题复盘",
    none: "还没有可复盘的考试",
    start: "开始考试",
    title: "逐题复盘",
    desc: "错题和空题先重新做一次，再揭示原作答、正确答案与解析。",
    wrongOnly: "错题 / 空题",
    all: "全部",
    correct: "正确",
    wrong: "错误",
    blank: "未作答",
    points: "分",
    answer: "正确答案",
    originalAnswer: "原作答",
    noSolution: "暂无解析。",
    questionZh: "中文题面",
    questionEn: "英文原题",
    retryTitle: "先重新做一次",
    retryHint: "先不要看答案。重新读题、独立选择，再提交。",
    retrySubmit: "提交重做",
    reveal: "直接看解析",
    retryCorrect: "这次答对了。现在对照原作答和解题过程，确认为什么。",
    retryWrong: "这次还没有答对。下面对照正确答案，找出转错的位置。",
    revealed: "已显示原作答、正确答案和解析。",
    integerPlaceholder: "输入答案",
    fullBook: "查看整本解析",
    hideBook: "收起整本解析",
  },
  en: {
    eyebrow: "REVIEW",
    none: "No exam available for review",
    start: "Start exam",
    title: "Answer review",
    desc: "Retry wrong and blank questions before revealing the original response, correct answer, and solution.",
    wrongOnly: "Wrong / Blank",
    all: "All",
    correct: "Correct",
    wrong: "Wrong",
    blank: "Blank",
    points: "pts",
    answer: "Correct answer",
    originalAnswer: "Original answer",
    noSolution: "No solution yet.",
    questionZh: "Chinese",
    questionEn: "Original English",
    retryTitle: "Try it again first",
    retryHint: "Do not look at the answer yet. Re-read the problem, answer independently, then submit.",
    retrySubmit: "Submit retry",
    reveal: "Show solution",
    retryCorrect: "Correct this time. Compare with your original response and confirm why the method works.",
    retryWrong: "Not correct yet. Compare with the correct answer below and find where the reasoning changed course.",
    revealed: "Original response, correct answer, and solution are now visible.",
    integerPlaceholder: "Enter answer",
    fullBook: "View full solution book",
    hideBook: "Hide full solution book",
  },
} as const;

function answersEqual(mode: "choice" | "integer" | undefined, got: string, want: string) {
  if (mode === "integer" && /^\d+$/.test(got) && /^\d+$/.test(want)) {
    return Number(got) === Number(want);
  }
  return got === want;
}

export default function ReviewClient({ initialAttempt = null }: { initialAttempt?: Attempt | null }) {
  const lang = useSiteLanguage();
  const [a] = useState<Attempt | null>(() => {
    if (initialAttempt) return initialAttempt;
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("math-competition-last-attempt") || localStorage.getItem("kangaroo-last-attempt");
    return raw ? JSON.parse(raw) : null;
  });
  const [mode, setMode] = useState<"all" | "wrong">("wrong");
  const [questionLang, setQuestionLang] = useState<DisplayLang>("zh");
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});
  const [retrySubmitted, setRetrySubmitted] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showSolutionBook, setShowSolutionBook] = useState(false);

  const solutionBook = useMemo(() => solutionBookForExam(a?.examId), [a?.examId]);
  const ui = UI[lang];
  const hasBilingual = Boolean(a?.questions.some(q => Boolean(q.stemEn) || Boolean(q.choicesEn?.length)));
  const rows = useMemo(() => {
    if (!a) return [];
    return a.grade.items
      .map(item => ({ item, q: a.questions.find(q => q.id === item.questionId) }))
      .filter(x => x.q)
      .filter(x => mode === "all" || x.item.correct !== true);
  }, [a, mode]);

  if (!a) {
    return <div className="center-card"><h2>{ui.none}</h2><Link className="primary-button" href="/">{ui.start}</Link></div>;
  }

  return <div className="review-shell">
    <div className="section-heading">
      <div>
        <span className="eyebrow">{ui.eyebrow}</span>
        <h1>{ui.title}</h1>
        <p>{ui.desc}</p>
      </div>
      <div>
        <div className="segmented">
          <button className={mode === "wrong" ? "active" : ""} onClick={() => setMode("wrong")}>{ui.wrongOnly}</button>
          <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>{ui.all}</button>
        </div>
        {hasBilingual && <div className="segmented" style={{ marginTop: 8 }}>
          <button className={questionLang === "zh" ? "active" : ""} onClick={() => setQuestionLang("zh")}>{ui.questionZh}</button>
          <button className={questionLang === "en" ? "active" : ""} onClick={() => setQuestionLang("en")}>{ui.questionEn}</button>
        </div>}
      </div>
    </div>

    {solutionBook && !hasExactQuestionMapping(solutionBook) && <div className="review-book-toggle">
      <button className="secondary-button" onClick={() => setShowSolutionBook(v => !v)}>
        {showSolutionBook ? ui.hideBook : ui.fullBook}
      </button>
      {showSolutionBook && <SolutionBookViewer book={solutionBook} lang={questionLang} />}
    </div>}

    <div className="review-list">
      {rows.map(({ item, q }) => {
        const question = q!;
        const stem = questionLang === "en" && question.stemEn ? question.stemEn : question.stem;
        const choices = questionLang === "en" && question.choicesEn?.length ? question.choicesEn : question.choices;
        const status = item.correct === true ? ui.correct : item.correct === false ? ui.wrong : ui.blank;
        const assetUrl = questionLang === "en"
          ? (question.assetUrlEn || question.assetUrl)
          : (question.assetUrlZh || question.assetUrl);
        const needsRetry = item.correct !== true;
        const isRevealed = !needsRetry || revealed[item.questionId] === true;
        const retryValue = retryAnswers[item.questionId] || "";
        const submitted = retrySubmitted[item.questionId] === true;
        const retryCorrect = submitted && answersEqual(question.answerMode, retryValue, item.correctAnswer);

        const submitRetry = () => {
          if (!retryValue) return;
          setRetrySubmitted(x => ({ ...x, [item.questionId]: true }));
          setRevealed(x => ({ ...x, [item.questionId]: true }));
        };
        const revealDirectly = () => {
          setRevealed(x => ({ ...x, [item.questionId]: true }));
        };

        return <article className="review-card" key={item.questionId}>
          <div className="review-card-head">
            <div>
              <strong>Q{item.questionNo}</strong>
              <span className={`status ${item.correct === true ? "ok" : item.correct === false ? "bad" : "blank"}`}>{status}</span>
            </div>
            <div className="review-trust">
              <span>{item.points} {ui.points} · {conceptLabel(item.concept, lang)}</span>
              <MathVerificationBadge verification={question.mathVerification} lang={lang} />
            </div>
          </div>

          <h2>{stem}</h2>
          {assetUrl && <Image className="review-question-asset" src={assetUrl} alt={lang === "zh" ? `第 ${item.questionNo} 题图示` : `Diagram for question ${item.questionNo}`} width={900} height={520} unoptimized />}

          {needsRetry && !isRevealed && <section className="review-retry-box">
            <div>
              <strong>{ui.retryTitle}</strong>
              <p>{ui.retryHint}</p>
            </div>
            {question.answerMode === "integer" || choices.length === 0
              ? <input
                  className="review-retry-input"
                  inputMode="numeric"
                  value={retryValue}
                  onChange={e => setRetryAnswers(x => ({ ...x, [item.questionId]: e.target.value.replace(/\D/g, "") }))}
                  placeholder={ui.integerPlaceholder}
                />
              : <div className="review-retry-choices">
                  {choices.map(c => <button
                    key={c.key}
                    className={retryValue === c.key ? "selected" : ""}
                    onClick={() => setRetryAnswers(x => ({ ...x, [item.questionId]: c.key }))}
                  >
                    <span>{c.key}</span>{c.label}
                  </button>)}
                </div>}
            <div className="review-retry-actions">
              <button className="primary-button" disabled={!retryValue} onClick={submitRetry}>{ui.retrySubmit}</button>
              <button className="secondary-button" onClick={revealDirectly}>{ui.reveal}</button>
            </div>
          </section>}

          {isRevealed && <>
            {submitted && <div className={retryCorrect ? "review-retry-feedback ok" : "review-retry-feedback bad"}>
              {retryCorrect ? ui.retryCorrect : ui.retryWrong}
            </div>}
            {!submitted && needsRetry && <div className="review-retry-feedback neutral">{ui.revealed}</div>}

            {choices.length > 0
              ? <div className="review-choices">{choices.map(c => <div
                  key={c.key}
                  className={[
                    item.selected === c.key ? "picked" : "",
                    item.correctAnswer === c.key ? "correct-choice" : "",
                    submitted && retryValue === c.key ? "retry-choice" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <span>{c.key}</span>{c.label}
                </div>)}</div>
              : <div className="review-answer-summary">
                  <span>{ui.originalAnswer}: <strong>{item.selected || "—"}</strong></span>
                  <span>{ui.answer}: <strong>{item.correctAnswer}</strong></span>
                </div>}

            <div className="solution-box">
              <strong>{ui.originalAnswer}: {item.selected || "—"} · {ui.answer}: {item.correctAnswer}</strong>
              <p>{item.solution || ui.noSolution}</p>
            </div>

            {solutionBook && hasExactQuestionMapping(solutionBook) && <SolutionBookViewer book={solutionBook} questionNo={item.questionNo} lang={questionLang} />}
            <SmartSolutionPlayer
              questionId={item.questionId}
              questionNo={item.questionNo}
              stem={stem}
              solution={item.solution}
              answer={item.correctAnswer}
              concept={item.concept}
              assetUrl={assetUrl}
            />
          </>}
        </article>;
      })}
    </div>
  </div>;
}
