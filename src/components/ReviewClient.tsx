"use client";
import Link from "next/link";
import { useMemo,useState } from "react";
import type { GradeResult, PublicQuestion } from "@/lib/types";
import { conceptLabel, type DisplayLang } from "@/lib/display";
import SmartSolutionPlayer from "@/components/SmartSolutionPlayer";
import SolutionBookViewer from "@/components/SolutionBookViewer";
import { hasExactQuestionMapping, solutionBookForExam } from "@/lib/solution-books";

type Attempt={examId?:string;lang?:DisplayLang;grade:GradeResult;answers:Record<string,string>;questions:PublicQuestion[]};
const UI={
 zh:{none:"还没有可复盘的考试",start:"开始考试",title:"逐题复盘",desc:"优先处理错题和空题，再回看全部答题轨迹。",wrongOnly:"错题 / 空题",all:"全部",correct:"正确",wrong:"错误",blank:"未作答",points:"分",answer:"答案",noSolution:"暂无解析。"},
 en:{none:"No exam available for review",start:"Start exam",title:"Answer review",desc:"Review wrong and blank answers first, then inspect the full attempt.",wrongOnly:"Wrong / Blank",all:"All",correct:"Correct",wrong:"Wrong",blank:"Blank",points:"pts",answer:"Answer",noSolution:"No solution yet."},
} as const;
export default function ReviewClient(){
  const [a] = useState<Attempt|null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("math-competition-last-attempt") || localStorage.getItem("kangaroo-last-attempt");
    return raw ? JSON.parse(raw) : null;
  });
  const [mode,setMode]=useState<"all"|"wrong">("wrong");
  const solutionBook=useMemo(()=>solutionBookForExam(a?.examId),[a?.examId]);
  const lang:DisplayLang=a?.lang==="en"?"en":"zh"; const ui=UI[lang];
  const rows=useMemo(()=>{
    if(!a)return [];
    return a.grade.items.map(item=>({item,q:a.questions.find(q=>q.id===item.questionId)})).filter(x=>x.q).filter(x=>mode==="all"||x.item.correct!==true);
  },[a,mode]);
  if(!a)return <div className="center-card"><h2>{ui.none}</h2><Link className="primary-button" href="/">{ui.start}</Link></div>;
  return <div className="review-shell">
    <div className="section-heading"><div><span className="eyebrow">REVIEW</span><h1>{ui.title}</h1><p>{ui.desc}</p></div><div className="segmented"><button className={mode==="wrong"?"active":""} onClick={()=>setMode("wrong")}>{ui.wrongOnly}</button><button className={mode==="all"?"active":""} onClick={()=>setMode("all")}>{ui.all}</button></div></div>
    {solutionBook&&!hasExactQuestionMapping(solutionBook)&&<SolutionBookViewer book={solutionBook} lang={lang} />}
    <div className="review-list">
      {rows.map(({item,q})=>{
        const stem=lang==="en"&&q!.stemEn?q!.stemEn:q!.stem;
        const choices=lang==="en"&&q!.choicesEn?.length?q!.choicesEn:q!.choices;
        const status=item.correct===true?ui.correct:item.correct===false?ui.wrong:ui.blank;
        const assetUrl=lang==="en"?(q!.assetUrlEn||q!.assetUrl):(q!.assetUrlZh||q!.assetUrl);
        return <article className="review-card" key={item.questionId}>
          <div className="review-card-head"><div><strong>Q{item.questionNo}</strong><span className={`status ${item.correct===true?"ok":item.correct===false?"bad":"blank"}`}>{status}</span></div><span>{item.points} {ui.points} · {conceptLabel(item.concept,lang)}</span></div>
          <h2>{stem}</h2>
          <div className="review-choices">{choices.map(c=><div key={c.key} className={[item.selected===c.key?"picked":"",item.correctAnswer===c.key?"correct-choice":""].join(" ")}><span>{c.key}</span>{c.label}</div>)}</div>
          <div className="solution-box"><strong>{ui.answer} {item.correctAnswer}</strong><p>{item.solution||ui.noSolution}</p></div>
          {solutionBook&&hasExactQuestionMapping(solutionBook)&&<SolutionBookViewer book={solutionBook} questionNo={item.questionNo} lang={lang} />}
          <SmartSolutionPlayer questionId={item.questionId} questionNo={item.questionNo} stem={stem} solution={item.solution} answer={item.correctAnswer} concept={item.concept} assetUrl={assetUrl} />
        </article>;
      })}
    </div>
  </div>;
}
