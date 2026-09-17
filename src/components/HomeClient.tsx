"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamProfile } from "@/lib/types";

type Lang="zh"|"en";
type GradeFilter="all"|"1-2"|"3-4"|"5-6"|"7-8"|"9-10"|"11+";
const GRADE_OPTIONS:GradeFilter[]=["all","1-2","3-4","5-6","7-8","9-10","11+"];
const REGION_ZH:Record<string,string>={Austria:"奥地利",Germany:"德国",Portugal:"葡萄牙",Local:"本地",Mixed:"智能混合"};

function gradeBucket(exam:ExamProfile):GradeFilter {
 const g=(exam.gradesEn||exam.grades||"").replace(/\s/g,"").toLowerCase();
 if(g==="grade2"||g.includes("1–2")||g.includes("1-2")) return "1-2";
 if(g.includes("3–4")||g.includes("3-4")) return "3-4";
 if(g.includes("5–6")||g.includes("5-6")) return "5-6";
 if(g.includes("7–8")||g.includes("7-8")) return "7-8";
 if(g.includes("9–10")||g.includes("9-10")||g==="grade9") return "9-10";
 return "11+";
}
function regionName(region:string,lang:Lang){return lang==="zh"?(REGION_ZH[region]||region):region;}
function yearOf(exam:ExamProfile){return exam.year??0;}

const UI={
 zh:{title1:"袋鼠数学",title2:"仿真考试实验室",copy:"从本地历年真题库中按年级、地区和年份训练，也可以自动生成跨年份、跨地区的平衡混合卷。学生端只显示中文或英文。",admin:"查看本地题库",choose:"选择训练学段",chooseDesc:"只显示答案已校验、且学生可以直接用中文或英文完成的试卷。",all:"全部年级",questions:"题",minutes:"分钟",max:"满分",start:"开始考试",open:"查看试卷",smart:"智能混合模考",past:"历年真题",papers:"套真题",regions:"个地区",range:"年份",exams:"套可考试试卷",items:"道可考试题位",visual:"原图",visualLabel:"保真",visualDesc:"几何、拼图、空间题保留原始图形",local:"本地",localLabel:"运行",localDesc:"题库、答案和图片全部留在本机"},
 en:{title1:"Math Kangaroo",title2:"Mock Exam Lab",copy:"Train by grade, region and year, or generate balanced mixed mocks across years and regions. Student-facing content is Chinese or English only.",admin:"Local question bank",choose:"Choose a grade band",chooseDesc:"Only answer-verified papers readable directly in Chinese or English are listed.",all:"All grades",questions:"questions",minutes:"min",max:"Max",start:"Start exam",open:"View papers",smart:"Smart mixed mock",past:"Past papers",papers:"papers",regions:"regions",range:"Years",exams:"ready exams",items:"ready question slots",visual:"Original",visualLabel:"graphics",visualDesc:"Geometry, puzzle and spatial diagrams preserve original artwork",local:"Local",localLabel:"runtime",localDesc:"Questions, answers and images stay on this machine"},
} as const;

export default function HomeClient({exams}:{exams:ExamProfile[]}){
 const [lang,setLang]=useState<Lang>(()=>typeof navigator!=="undefined"&&!navigator.language.toLowerCase().startsWith("zh")?"en":"zh");
 const [grade,setGrade]=useState<GradeFilter>("all");
 const [region,setRegion]=useState("all");
 const router=useRouter(); const ui=UI[lang];
 const archives=exams.filter(x=>x.country!=="Mixed");
 const mixed=exams.filter(x=>x.country==="Mixed");
 const archiveQuestionSlots=archives.reduce((s,x)=>s+x.questionCount,0);
 const selectedArchives=grade==="all"?[]:archives.filter(x=>gradeBucket(x)===grade);
 const availableRegions=[...new Set(selectedArchives.map(x=>x.country||"Local"))].sort();
 const visibleArchives=selectedArchives.filter(x=>region==="all"||(x.country||"Local")===region);
 const selectedMixed=grade==="all"?[]:mixed.filter(x=>gradeBucket(x)===grade);
 const groups=[...new Set(visibleArchives.map(x=>x.country||"Local"))].sort();
 const gradeLabel=(g:GradeFilter)=>g==="all"?ui.all:(g==="11+"?(lang==="zh"?"11–13年级":"Grades 11–13"):(lang==="zh"?`${g}年级`:`Grades ${g}`));
 const startExam=(exam:ExamProfile,event:React.MouseEvent)=>{
   if(exam.country==="Mixed") router.push(`/exam/${exam.id}-${Math.floor(event.timeStamp*1000).toString(36)}`);
   else router.push(`/exam/${exam.id}`);
 };
 const card=(exam:ExamProfile)=>{
   const name=lang==="zh"?(exam.nameZh||exam.name):(exam.nameEn||exam.name);
   const source=lang==="zh"?(exam.sourceLabelZh||exam.sourceLabel):(exam.sourceLabelEn||exam.sourceLabel);
   const badge=exam.language==="en"?"EN":"中 / EN";
   return <article key={exam.id}><div className="feature-index">{regionName(exam.country||"Local",lang)} · {badge}</div><h2>{name}</h2><p>{exam.questionCount} {ui.questions} · {Math.round(exam.durationSeconds/60)} {ui.minutes} · {ui.max} {exam.maxScore}</p>{source&&<p>{source}</p>}<button className="primary-button" onClick={e=>startExam(exam,e)}>{ui.start}</button></article>;
 };
 return <div className="home-shell">
  <section className="hero-card"><div className="eyebrow">LOCAL COMPETITION TRAINING</div><div className="hero-actions" style={{float:"right"}}><button className="secondary-button" onClick={()=>setLang(x=>x==="zh"?"en":"zh")}>{lang==="zh"?"EN":"中"}</button></div><h1>{ui.title1}<br/><span>{ui.title2}</span></h1><p className="hero-copy">{ui.copy}</p></section>
  <section className="section-heading"><div><span className="eyebrow">GRADE BANDS</span><h1>{ui.choose}</h1><p>{ui.chooseDesc}</p></div></section>
  <div className="segmented" style={{marginBottom:28,flexWrap:"wrap"}}>{GRADE_OPTIONS.map(g=><button key={g} className={grade===g?"active":""} onClick={()=>{setGrade(g);setRegion("all")}}>{gradeLabel(g)}</button>)}</div>
  {grade==="all" ? <section className="feature-grid">{GRADE_OPTIONS.filter(g=>g!=="all").map(g=>{const set=archives.filter(x=>gradeBucket(x)===g);const regs=[...new Set(set.map(x=>x.country||"Local"))];const years=set.map(yearOf).filter(Boolean);return <article key={g}><div className="feature-index">{regs.map(r=>regionName(r,lang)).join(" + ")}</div><h2>{gradeLabel(g)}</h2><p><strong>{set.length}</strong> {ui.papers} · {regs.length} {ui.regions}</p><p>{years.length?`${ui.range} ${Math.min(...years)}–${Math.max(...years)}`:""}</p><button className="primary-button" onClick={()=>{setGrade(g);setRegion("all")}}>{ui.open}</button></article>})}</section> : <>
    {selectedMixed.length>0&&<><section className="section-heading" style={{marginTop:36}}><div><span className="eyebrow">SMART MIX</span><h1>{ui.smart}</h1></div></section><section className="feature-grid">{selectedMixed.map(card)}</section></>}
    <section className="section-heading" style={{marginTop:48}}><div><span className="eyebrow">PAST PAPERS</span><h1>{ui.past}</h1></div></section>
    <div className="segmented" style={{marginBottom:24,flexWrap:"wrap"}}><button className={region==="all"?"active":""} onClick={()=>setRegion("all")}>{lang==="zh"?"全部地区":"All regions"}</button>{availableRegions.map(r=><button key={r} className={region===r?"active":""} onClick={()=>setRegion(r)}>{regionName(r,lang)}</button>)}</div>
    {groups.map(r=><section key={r}><div className="section-heading" style={{marginTop:28,marginBottom:8}}><div><span className="eyebrow">{regionName(r,lang)}</span></div></div><div className="feature-grid">{visibleArchives.filter(x=>(x.country||"Local")===r).sort((a,b)=>yearOf(b)-yearOf(a)||a.id.localeCompare(b.id)).map(card)}</div></section>)}
  </>}
  <section className="stat-grid"><article><strong>{archives.length}</strong><span>{ui.exams}</span><p>{[...new Set(archives.map(x=>x.country))].filter(Boolean).map(x=>regionName(x!,lang)).join(" · ")}</p></article><article><strong>{archiveQuestionSlots}</strong><span>{ui.items}</span><p>{lang==="zh"?"按各套试卷题数累计":"Sum of question counts across ready papers"}</p></article><article><strong>{ui.visual}</strong><span>{ui.visualLabel}</span><p>{ui.visualDesc}</p></article><article><strong>{ui.local}</strong><span>{ui.localLabel}</span><p>{ui.localDesc}</p></article></section>
 </div>;
}
