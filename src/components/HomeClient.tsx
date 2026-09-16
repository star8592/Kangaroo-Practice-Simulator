"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamProfile } from "@/lib/types";

type Lang="zh"|"en";
const UI={
 zh:{title1:"袋鼠数学",title2:"仿真考试实验室",copy:"基于本地历年真题构建的中英双语仿真考试系统。每套试卷使用自己的题数、计时与计分规则。",admin:"查看本地题库",choose:"选择考试",chooseDesc:"只有完成中英翻译、答案校验和视觉检查的试卷才会出现在这里。",questions:"题",minutes:"分钟",max:"满分",start:"开始考试",exams:"套考试",examDesc:"配置驱动，可持续增加国家与年份",visual:"原图",visualLabel:"保真",visualDesc:"几何、拼图、空间题保留 PDF 原始图形",timer:"分钟",timerDesc:"倒计时、自动交卷与答题事件记录",local:"本地",localLabel:"优先",localDesc:"题库、答案和解析留在本机"},
 en:{title1:"Math Kangaroo",title2:"Mock Exam Lab",copy:"A bilingual Chinese-English mock-exam system built from a local archive of past papers. Each paper keeps its own question count, time limit and scoring rules.",admin:"Local question bank",choose:"Choose an exam",chooseDesc:"Only papers that pass bilingual translation, answer verification and visual checks are shown here.",questions:"questions",minutes:"min",max:"Max",start:"Start exam",exams:"exams",examDesc:"Config-driven and ready to expand across years and countries",visual:"Original",visualLabel:"graphics",visualDesc:"Geometry, puzzle and spatial diagrams preserve the PDF artwork",timer:"min",timerDesc:"Countdown, auto-submit and answer-event tracking",local:"Local",localLabel:"first",localDesc:"Questions, answers and solutions stay on this machine"},
} as const;

export default function HomeClient({exams}:{exams:ExamProfile[]}){
 const [lang,setLang]=useState<Lang>(()=>typeof navigator!=="undefined"&&!navigator.language.toLowerCase().startsWith("zh")?"en":"zh");
 const ui=UI[lang];
 const router=useRouter();
 return <div className="home-shell">
  <section className="hero-card">
   <div className="eyebrow">LOCAL COMPETITION TRAINING</div>
   <div className="hero-actions" style={{float:"right"}}><button className="secondary-button" onClick={()=>setLang(x=>x==="zh"?"en":"zh")}>{lang==="zh"?"EN":"中"}</button></div>
   <h1>{ui.title1}<br/><span>{ui.title2}</span></h1><p className="hero-copy">{ui.copy}</p>
   <div className="hero-actions"><Link className="secondary-button" href="/admin/questions">{ui.admin}</Link></div>
  </section>
  <section className="section-heading"><div><span className="eyebrow">AVAILABLE EXAMS</span><h1>{ui.choose}</h1><p>{ui.chooseDesc}</p></div></section>
  <section className="feature-grid">{exams.map(exam=>{
    const name=lang==="zh"?(exam.nameZh||exam.name):(exam.nameEn||exam.name);
    const grades=lang==="zh"?(exam.gradesZh||exam.grades):(exam.gradesEn||exam.grades);
    const source=lang==="zh"?(exam.sourceLabelZh||exam.sourceLabel):(exam.sourceLabelEn||exam.sourceLabel);
    const mixed=exam.id==="mixed24"||exam.id==="mixed15";
    return <article key={exam.id}><div className="feature-index">{exam.country??"LOCAL"}</div><h2>{name}</h2><p>{grades} · {exam.questionCount} {ui.questions} · {Math.round(exam.durationSeconds/60)} {ui.minutes} · {ui.max} {exam.maxScore}</p>{source&&<p>{source}</p>}{mixed?<button className="primary-button" onClick={(event)=>router.push(`/exam/${exam.id}-${Math.floor(event.timeStamp*1000).toString(36)}`)}>{ui.start}</button>:<Link className="primary-button" href={`/exam/${exam.id}`}>{ui.start}</Link>}</article>;
  })}</section>
  <section className="stat-grid"><article><strong>{exams.length}</strong><span>{ui.exams}</span><p>{ui.examDesc}</p></article><article><strong>{ui.visual}</strong><span>{ui.visualLabel}</span><p>{ui.visualDesc}</p></article><article><strong>75</strong><span>{ui.timer}</span><p>{ui.timerDesc}</p></article><article><strong>{ui.local}</strong><span>{ui.localLabel}</span><p>{ui.localDesc}</p></article></section>
 </div>;
}
