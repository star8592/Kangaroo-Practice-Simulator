"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ExamProfile, PublicQuestion } from "@/lib/types";

type Event = { type:string; questionId?:string; at:number; value?:string };

export default function ExamClient({ examId }: { examId: string }) {
  const router = useRouter();
  const [questions,setQuestions] = useState<PublicQuestion[]>([]);
  const [profile,setProfile] = useState<ExamProfile|null>(null);
  const [index,setIndex] = useState(0);
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [flagged,setFlagged] = useState<Record<string,boolean>>({});
  const [seconds,setSeconds] = useState(75*60);
  const [lang,setLang] = useState<"zh"|"en">("zh");
  const [events,setEvents] = useState<Event[]>([]);
  const [submitting,setSubmitting] = useState(false);
  const [showSubmit,setShowSubmit] = useState(false);
  const [error,setError] = useState("");

  useEffect(()=>{
    fetch(`/api/exams/${encodeURIComponent(examId)}`).then(r=>r.json()).then(data=>{
      if(data.error) throw new Error(data.error);
      setQuestions(data.questions); setProfile(data.profile); setSeconds(data.profile.durationSeconds);
      setEvents([{type:"exam_start",at:Date.now()}]);
    }).catch(e=>setError(String(e.message||e)));
  },[examId]);

  useEffect(()=>{
    if(!profile || submitting) return;
    const t=setInterval(()=>setSeconds(s=>{
      if(s<=1){ clearInterval(t); void submitExam(true); return 0; }
      return s-1;
    }),1000);
    return ()=>clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[profile,submitting]);

  const q=questions[index];
  const answered=Object.keys(answers).length;
  const remaining=questions.length-answered;
  const minutes=String(Math.floor(seconds/60)).padStart(2,"0");
  const secs=String(seconds%60).padStart(2,"0");
  const progress=questions.length ? ((index+1)/questions.length)*100 : 0;
  const pointBand = useMemo(()=>q?.points===3?"easy":q?.points===4?"medium":"hard",[q]);

  function record(type:string,questionId?:string,value?:string){ setEvents(e=>[...e,{type,questionId,at:Date.now(),value}]); }
  function choose(key:string){ if(!q)return; setAnswers(a=>({...a,[q.id]:key})); record("answer_selected",q.id,key); }
  function go(next:number){ if(!q)return; record("question_leave",q.id); setIndex(Math.max(0,Math.min(questions.length-1,next))); }
  function toggleFlag(){ if(!q)return; setFlagged(f=>({...f,[q.id]:!f[q.id]})); record(flagged[q.id]?"unflagged":"flagged",q.id); }

  async function submitExam(auto=false){
    if(submitting) return;
    setSubmitting(true); setShowSubmit(false); record(auto?"auto_submit":"submit");
    try{
      const res=await fetch("/api/grade",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({examId,answers})});
      const grade=await res.json();
      if(!res.ok) throw new Error(grade.error||"评分失败");
      const payload={examId,profile,grade,answers,events:[...events,{type:auto?"auto_submit":"submit",at:Date.now()}],submittedAt:Date.now(),elapsedSeconds:(profile?.durationSeconds??4500)-seconds,questions};
      localStorage.setItem("kangaroo-last-attempt",JSON.stringify(payload));
      router.push("/result");
    }catch(e){ setError(e instanceof Error?e.message:String(e)); setSubmitting(false); }
  }

  if(error) return <div className="center-card"><h2>题库加载失败</h2><p>{error}</p></div>;
  if(!profile || !q) return <div className="center-card"><div className="loader"/><p>正在装载本地题库…</p></div>;

  const stem=lang==="en" && q.stemEn ? q.stemEn : q.stem;
  const choices=lang==="en" && q.choicesEn?.length ? q.choicesEn : q.choices;
  const hasBilingual=Boolean(q.stemEn || q.choicesEn?.length);

  return <div className="exam-shell">
    <header className="exam-topbar">
      <div><span className="exam-kicker">{profile.name}</span><strong>{profile.grades}</strong></div>
      <div className={seconds<600?"timer danger":"timer"}><span>剩余时间</span><strong>{minutes}:{secs}</strong></div>
      <button className="ghost-button" onClick={()=>setShowSubmit(true)}>交卷</button>
    </header>

    <div className="exam-progress"><span style={{width:`${progress}%`}}/></div>

    <div className="exam-layout">
      <aside className="question-nav">
        <div className="nav-summary"><strong>{answered}</strong><span>/ {questions.length} 已答</span></div>
        <div className="number-grid">
          {questions.map((item,i)=><button key={item.id} onClick={()=>go(i)} className={[i===index?"current":"",answers[item.id]?"answered":"",flagged[item.id]?"flagged":""].join(" ")}>{i+1}</button>)}
        </div>
        <div className="legend"><span><i className="dot answered"/>已答</span><span><i className="dot flag"/>标记</span></div>
      </aside>

      <section className="question-card">
        <div className="question-meta">
          <div><span className="q-number">Question {index+1}</span><span className={`point-badge ${pointBand}`}>{q.points} 分</span></div>
          <div className="question-tools">{hasBilingual&&<button onClick={()=>setLang(l=>l==="zh"?"en":"zh")}>{lang==="zh"?"EN":"中"}</button>}<button onClick={toggleFlag}>{flagged[q.id]?"★ 已标记":"☆ 标记"}</button></div>
        </div>
        <div className="concept-label">{q.concept}</div>
        <h1 className="question-stem">{stem}</h1>
        {q.assetUrl && <Image className="question-asset" src={q.assetUrl} alt="题目图示" width={900} height={500} unoptimized/>}
        <div className="choice-list">
          {choices.map(c=><button key={c.key} onClick={()=>choose(c.key)} className={answers[q.id]===c.key?"choice selected":"choice"}><span className="choice-key">{c.key}</span><span>{c.label}</span></button>)}
        </div>
        <footer className="question-footer">
          <button className="secondary-button" disabled={index===0} onClick={()=>go(index-1)}>← 上一题</button>
          <div className="question-counter">{index+1} / {questions.length}</div>
          <button className="primary-button" disabled={index===questions.length-1} onClick={()=>go(index+1)}>下一题 →</button>
        </footer>
      </section>
    </div>

    {showSubmit && <div className="modal-backdrop"><div className="submit-modal"><div className="modal-icon">✓</div><h2>确认交卷？</h2><p>已完成 <strong>{answered}</strong> 题，未作答 <strong>{remaining}</strong> 题，已标记 <strong>{Object.values(flagged).filter(Boolean).length}</strong> 题。</p>{remaining>0&&<div className="warning-box">仍有未作答题目。空题不扣分，可以返回检查。</div>}<div className="modal-actions"><button className="secondary-button" onClick={()=>setShowSubmit(false)}>返回检查</button><button className="primary-button" disabled={submitting} onClick={()=>void submitExam(false)}>{submitting?"正在评分…":"确认提交"}</button></div></div></div>}
  </div>;
}
