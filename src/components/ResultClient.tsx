"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamProfile, GradeResult } from "@/lib/types";
import { conceptLabel, type DisplayLang } from "@/lib/display";

type Attempt={examId?:string;profile?:ExamProfile;lang?:DisplayLang;grade:GradeResult;elapsedSeconds:number;submittedAt:number};
function scoreText(n:number){ return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,"").replace(/\.$/,""); }

const UI={
  zh:{noResult:"暂无考试结果",backList:"返回考试列表",result:"本次成绩",time:"完成时间",correct:"正确",wrong:"错误",blank:"空题",difficulty:"按难度",points:"分题",concepts:"知识点表现",review:"逐题复盘",again:"再考一次",same:"同卷重做",newMix:"换一套新卷",list:"考试列表"},
  en:{noResult:"No exam result yet",backList:"Back to exams",result:"Your result",time:"Time used",correct:"Correct",wrong:"Wrong",blank:"Blank",difficulty:"By difficulty",points:"-point",concepts:"Performance by skill",review:"Review answers",again:"Try again",same:"Retry same paper",newMix:"New mixed paper",list:"Exam list"},
} as const;

export default function ResultClient(){
  const router=useRouter();
  const [a] = useState<Attempt|null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("kangaroo-last-attempt");
    return raw ? JSON.parse(raw) : null;
  });
  const lang:DisplayLang=a?.lang==="en"?"en":"zh";
  const ui=UI[lang];
  if(!a)return <div className="center-card"><h2>{ui.noResult}</h2><Link className="primary-button" href="/">{ui.backList}</Link></div>;
  const g=a.grade; const pct=Math.round((g.score/g.maxScore)*100); const mins=Math.floor(a.elapsedSeconds/60); const secs=a.elapsedSeconds%60;
  const examId=a.examId??"level-a";
  const mixedMatch=/^(mix-(?:g12|g34|g56|g78|g910|g1113)|mixed24|mixed15)-/.exec(examId);
  const mixedBase=mixedMatch?.[1]??null;
  const title=lang==="zh" ? (a.profile?.nameZh||a.profile?.name||"LEVEL A") : (a.profile?.nameEn||a.profile?.name||"LEVEL A");
  return <div className="report-shell">
    <section className="score-hero"><div><span className="eyebrow">{title} · RESULT</span><h1>{ui.result}</h1><p>{ui.time} {mins}:{String(secs).padStart(2,"0")}</p></div><div className="score-ring"><strong>{scoreText(g.score)}</strong><span>/ {scoreText(g.maxScore)}</span><small>{pct}%</small></div></section>
    <section className="result-stats"><article><strong>{g.correct}</strong><span>{ui.correct}</span></article><article><strong>{g.wrong}</strong><span>{ui.wrong}</span></article><article><strong>{g.blank}</strong><span>{ui.blank}</span></article></section>
    <section className="report-grid">
      <article className="report-card"><h2>{ui.difficulty}</h2>{Object.entries(g.byPoints).sort().map(([p,v])=><div className="metric-row" key={p}><span>{lang==="zh"?`${p} ${ui.points}`:`${p}${ui.points}`}</span><div className="metric-bar"><i style={{width:`${(v.correct/v.total)*100}%`}}/></div><strong>{v.correct}/{v.total}</strong></div>)}</article>
      <article className="report-card"><h2>{ui.concepts}</h2>{Object.entries(g.byConcept).sort((x,y)=>y[1].total-x[1].total).slice(0,8).map(([name,v])=><div className="metric-row" key={name}><span>{conceptLabel(name,lang)}</span><div className="metric-bar"><i style={{width:`${(v.correct/v.total)*100}%`}}/></div><strong>{v.correct}/{v.total}</strong></div>)}</article>
    </section>
    <div className="report-actions"><Link className="primary-button" href="/review">{ui.review}</Link><Link className="secondary-button" href={`/exam/${examId}`}>{mixedBase?ui.same:ui.again}</Link>{mixedBase&&<button className="secondary-button" onClick={(event)=>router.push(`/exam/${mixedBase}-${Math.floor(event.timeStamp*1000).toString(36)}`)}>{ui.newMix}</button>}<Link className="secondary-button" href="/">{ui.list}</Link></div>
  </div>;
}
