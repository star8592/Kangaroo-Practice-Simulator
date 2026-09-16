"use client";
import { useEffect,useMemo,useState } from "react";
import type { Question } from "@/lib/types";

export default function AdminQuestions(){
  const [questions,setQuestions]=useState<Question[]>([]); const [query,setQuery]=useState(""); const [points,setPoints]=useState("all"); const [error,setError]=useState("");
  useEffect(()=>{fetch("/api/admin/questions").then(r=>r.json()).then(d=>{if(d.error)throw new Error(d.error);setQuestions(d.questions)}).catch(e=>setError(e.message));},[]);
  const filtered=useMemo(()=>questions.filter(q=>(points==="all"||String(q.points)===points)&&(!query||`${q.stem} ${q.concept} ${q.year}`.toLowerCase().includes(query.toLowerCase()))),[questions,query,points]);
  if(error)return <div className="center-card"><h2>题库读取失败</h2><p>{error}</p></div>;
  return <div className="admin-shell">
    <div className="section-heading"><div><span className="eyebrow">LOCAL QUESTION BANK</span><h1>题库审核台</h1><p>{questions.length} 道本地题目 · 第一版用于核对结构化抽取质量。</p></div></div>
    <div className="admin-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索题目 / 知识点 / 年份"/><select value={points} onChange={e=>setPoints(e.target.value)}><option value="all">全部难度</option><option value="3">3 分</option><option value="4">4 分</option><option value="5">5 分</option></select></div>
    <div className="admin-table"><div className="admin-row admin-head"><span>#</span><span>题目</span><span>来源</span><span>答案</span><span>状态</span></div>{filtered.map(q=><div className="admin-row" key={q.id}><span>{q.questionNo}</span><span><strong>{q.concept}</strong><small>{q.stem}</small></span><span><small>{q.year} · {q.points}分</small></span><span><b>{q.answer}</b></span><span><i className={q.verified?"reviewed":"pending"}>{q.verified?"已审核":"待审核"}</i></span></div>)}</div>
  </div>;
}
