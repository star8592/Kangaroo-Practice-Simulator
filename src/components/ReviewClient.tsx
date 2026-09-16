"use client";
import Link from "next/link";
import { useMemo,useState } from "react";
import type { GradeResult, PublicQuestion } from "@/lib/types";

type Attempt={grade:GradeResult;answers:Record<string,string>;questions:PublicQuestion[]};
export default function ReviewClient(){
  const [a] = useState<Attempt|null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("kangaroo-last-attempt");
    return raw ? JSON.parse(raw) : null;
  });
  const [mode,setMode]=useState<"all"|"wrong">("wrong");
  const rows=useMemo(()=>{
    if(!a)return [];
    return a.grade.items.map(item=>({item,q:a.questions.find(q=>q.id===item.questionId)})).filter(x=>x.q).filter(x=>mode==="all"||x.item.correct!==true);
  },[a,mode]);
  if(!a)return <div className="center-card"><h2>还没有可复盘的考试</h2><Link className="primary-button" href="/exam/level-a">开始考试</Link></div>;
  return <div className="review-shell">
    <div className="section-heading"><div><span className="eyebrow">REVIEW</span><h1>逐题复盘</h1><p>优先处理错题和空题，再回看全部答题轨迹。</p></div><div className="segmented"><button className={mode==="wrong"?"active":""} onClick={()=>setMode("wrong")}>错题 / 空题</button><button className={mode==="all"?"active":""} onClick={()=>setMode("all")}>全部</button></div></div>
    <div className="review-list">
      {rows.map(({item,q})=><article className="review-card" key={item.questionId}>
        <div className="review-card-head"><div><strong>Q{item.questionNo}</strong><span className={`status ${item.correct===true?"ok":item.correct===false?"bad":"blank"}`}>{item.correct===true?"正确":item.correct===false?"错误":"未作答"}</span></div><span>{item.points} 分 · {item.concept}</span></div>
        <h2>{q!.stem}</h2>
        <div className="review-choices">{q!.choices.map(c=><div key={c.key} className={[item.selected===c.key?"picked":"",item.correctAnswer===c.key?"correct-choice":""].join(" ")}><span>{c.key}</span>{c.label}</div>)}</div>
        <div className="solution-box"><strong>答案 {item.correctAnswer}</strong><p>{item.solution||"暂无解析。"}</p></div>
      </article>)}
    </div>
  </div>;
}
