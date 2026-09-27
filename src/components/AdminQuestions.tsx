"use client";

import { useEffect, useMemo, useState } from "react";
import type { Question } from "@/lib/types";
import styles from "./AdminQuestions.module.css";

export default function AdminQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [query, setQuery] = useState("");
  const [points, setPoints] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/questions")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setQuestions(data.questions);
      })
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => questions.filter((question) =>
    (points === "all" || String(question.points) === points) &&
    (!query || `${question.stem} ${question.concept} ${question.year}`.toLowerCase().includes(query.toLowerCase())),
  ), [questions, query, points]);

  const verifiedCount = questions.filter((question) => question.verified).length;

  if (error) {
    return <div className={styles.errorCard}><h2>题库读取失败</h2><p>{error}</p></div>;
  }

  return (
    <div className={`admin-shell ${styles.shell}`}>
      <section className={styles.heading}>
        <div>
          <span className={styles.kicker}>题库审核</span>
          <h1>结构化题库检查台</h1>
          <p>快速核对题干、知识点、年份、分值与答案状态。</p>
        </div>
        <div className={styles.stat}>
          <strong>{questions.length}</strong>
          <span>题目总数 · 已审核 {verifiedCount}</span>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题目、知识点或年份" aria-label="搜索题库" />
        </div>
        <select value={points} onChange={(e) => setPoints(e.target.value)} aria-label="按分值筛选">
          <option value="all">全部分值</option>
          <option value="3">3 分题</option>
          <option value="4">4 分题</option>
          <option value="5">5 分题</option>
        </select>
      </section>

      <p className={styles.resultMeta}>当前显示 {filtered.length} / {questions.length} 道题</p>

      <section className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          <span>#</span><span>题目</span><span>来源</span><span>答案</span><span>审核状态</span>
        </div>
        {filtered.map((question) => (
          <div className={styles.row} key={question.id}>
            <span className={styles.questionNo}>{question.questionNo}</span>
            <span className={styles.questionCell}>
              <strong>{question.concept}</strong>
              <small>{question.stem}</small>
            </span>
            <span className={styles.sourceCell}><b>{question.year}</b><small>{question.points} 分</small></span>
            <span className={styles.answer}>{question.answer}</span>
            <i className={`${styles.status} ${question.verified ? styles.reviewed : styles.pending}`}>{question.verified ? "已审核" : "待审核"}</i>
          </div>
        ))}
        {filtered.length === 0 && <div className={styles.empty}>没有符合当前条件的题目。</div>}
      </section>
    </div>
  );
}
