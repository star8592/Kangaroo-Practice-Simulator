"use client";
import { useState } from "react";
import { useSiteLanguage } from "@/lib/site-language";
import type { FeedbackCategory } from "@/lib/customer-feedback";
import styles from "./ExamCustomerFeedback.module.css";

const options: { id: FeedbackCategory; zh: string; en: string }[] = [
  { id: "question_error", zh: "题目/答案有误", en: "Question/answer error" },
  { id: "solution_unclear", zh: "解析看不懂", en: "Solution is unclear" },
  { id: "report_inaccurate", zh: "测评报告不准确", en: "Report is inaccurate" },
  { id: "usability", zh: "操作体验建议", en: "Website usability" },
  { id: "other", zh: "其他建议", en: "Other feedback" },
];

export default function ExamCustomerFeedback({
  attemptId, examId, questionId, source,
}: { attemptId: string; examId: string; questionId?: string; source: "result" | "review" }) {
  const lang = useSiteLanguage();
  const zh = lang !== "en";
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [key] = useState(() => globalThis.crypto?.randomUUID?.() ?? "feedback_"+Date.now().toString(36));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function send() {
    if (!category || state === "saving" || state === "saved") return;
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/student/feedback", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, examId, ...(questionId ? { questionId } : {}),
          category, ...(rating !== null ? { rating } : {}), message, source, idempotencyKey: key }),
      });
      const body = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !body.ok) throw new Error(body.error || (zh ? "提交失败" : "Failed to send"));
      setState("saved");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : (zh ? "暂时无法提交" : "Unable to send"));
    }
  }
  if (!attemptId) return null;
  return <section className={styles.shell} aria-label={zh ? "考试反馈" : "Exam feedback"}>
    <h3 className={styles.title}>{questionId ? (zh ? "这道题有问题吗？" : "Problem with this question?") :
      (zh ? "这次测评帮到你了吗？" : "Was this assessment useful?")}</h3>
    <p className={styles.hint}>{zh ? "你的反馈会帮助我们优先改正题目、解析和操作体验。" :
      "Your feedback helps us improve questions, solutions and usability."}</p>
    {state === "saved" ? <p className={styles.saved} role="status">{zh ? "反馈已保存，谢谢。" : "Feedback saved. Thank you!"}</p> : <>
      <div className={styles.pills}>{options.map(o => <button type="button" key={o.id}
        className={styles.pill} aria-pressed={category === o.id} onClick={() => setCategory(o.id)}>
        {zh ? o.zh : o.en}</button>)}</div>
      {!questionId && <div className={styles.rating}><span>{zh ? "总体体验（选填）：" : "Overall rating (optional): "}</span>
        {[1,2,3,4,5].map(n => <button type="button" key={n} aria-label={n + " / 5"}
          className={styles.star} aria-pressed={rating === n} onClick={() => setRating(rating === n ? null : n)}>
          {rating !== null && n <= rating ? "★" : "☆"}</button>)}</div>}
      <textarea className={styles.input} maxLength={400} value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={zh ? "请描述具体问题（选填）。不要填写孩子姓名、电话等个人信息。" :
          "Please describe the issue. Do not include personal information."} />
      <div className={styles.actions}><small>{zh ? "最多400字，仅用于产品改进" : "400-character limit"}</small>
        <button className={styles.submit} type="button" disabled={!category || state === "saving"} onClick={send}>
          {state === "saving" ? (zh ? "正在保存…" : "Sending…") : (zh ? "提交反馈" : "Send feedback")}
        </button></div>
      {state === "error" && <p role="alert" className={styles.error}>{error}</p>}
    </>}
  </section>;
}
