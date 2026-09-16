"use client";
import Link from "next/link";
import { useState } from "react";
import type { ExamProfile, GradeResult } from "@/lib/types";

type Attempt={examId?:string;profile?:ExamProfile;grade:GradeResult;elapsedSeconds:number;submittedAt:number};
function scoreText(n:number){ return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,""); }
export default function ResultClient(){
  const [a] = useState<Attempt|null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("kangaroo-last-attempt");
    return raw ? JSON.parse(raw) : null;
  });
  if(!a)return <div className="center-card"><h2>暂无考试结果</h2><Link className="primary-button" href="/">返回考试列表</Link></div>;
  const g=a.grade; const pct=Math.round((g.score/g.maxScore)*100); const mins=Math.floor(a.elapsedSeconds/60); const secs=a.elapsedSeconds%60;
  const examId=a.examId??"level-a"; const title=a.profile?.name??"LEVEL A";
  return <div className="report-shell">
    <section className="score-hero"><div><span className="eyebrow">{title} · RESULT</span><h1>本次成绩</h1><p>完成时间 {mins}:{String(secs).padStart(2,"0")}</p></div><div className="score-ring"><strong>{scoreText(g.score)}</strong><span>/ {scoreText(g.maxScore)}</span><small>{pct}%</small></div></section>
    <section className="result-stats"><article><strong>{g.correct}</strong><span>正确</span></article><article><strong>{g.wrong}</strong><span>错误</span></article><article><strong>{g.blank}</strong><span>空题</span></article></section>
    <section className="report-grid"><article className="report-card"><h2>按难度</h2>{Object.entries(g.byPoints).sort().map(([p,v])=><div className="metric-row" key={p}><span>{p} 分题</span><div className="metric-bar"><i style={{width:`${(v.correct/v.total)*100}%`}}/></div><strong>{v.correct}/{v.total}</strong></div>)}</article><article className="report-card"><h2>知识点表现</h2>{Object.entries(g.byConcept).sort((a,b)=>b[1].total-a[1].total).slice(0,8).map(([name,v])=><div className="metric-row" key={name}><span>{name}</span><div className="metric-bar"><i style={{width:`${(v.correct/v.total)*100}%`}}/></div><strong>{v.correct}/{v.total}</strong></div>)}</article></section>
    <div className="report-actions"><Link className="primary-button" href="/review">逐题复盘</Link><Link className="secondary-button" href={`/exam/${examId}`}>再考一次</Link><Link className="secondary-button" href="/">考试列表</Link></div>
  </div>;
}
