"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CLEVER_NODE_GUIDE,GRADE_PROFILES,type ArithmeticGrade } from "@/lib/arithmetic";
import { buildTrainingPlan,type ArithmeticSession } from "@/lib/arithmetic-analytics";
import { makeArithmeticWorksheet,type ArithmeticPrintMode } from "@/lib/arithmetic-print";
import { formatArithmeticDisplay } from "@/lib/arithmetic-display";
import { useSiteLanguage,type SiteLang } from "@/lib/site-language";

const QUESTION_OPTIONS = [20, 30, 40, 50, 60, 80] as const;
const SHEET_OPTIONS = [1, 2, 3, 5, 10, 15, 20] as const;

const UI={
 zh:{
  paperTraining:"纸笔训练",title:"A4 计算批量打印",intro:"默认使用该学生自己的计算历史生成个性化纸笔训练；也可切换年级综合或老师指定专项。",back:"返回计算中心",personalized:"个性化生成",generateFor:"生成",
  noEvidence:"这个年级还没有计算行为数据。系统不会凭空制造“弱项”，本批先按年级标准均衡出题；完成在线诊断后再自动个性化。",basedOn:"配题依据：最近",personalData:"题个人数据。默认每张约",mixRule:"60% 重点修复 + 25% 同技能巩固 + 15% 综合复习",focusSkill:"重点技能",focusNode:"巧算结构",balancedEvidence1:"已分析最近",balancedEvidence2:"题，目前没有足够证据判定稳定弱项。系统自动采用均衡巩固，不因为一次慢题或一次错误过度加练。",autoOff:"当前已关闭自动个性化。",manualOnly:"本批严格只出老师指定专项。",mixedOnly:"本批按年级标准权重综合出题。",
  grade:"年级",mode:"配题模式",smart:"智能个性化（默认）",mixed:"年级综合训练",manual:"老师指定专项",skill:"专项内容",questionsPerSheet:"每张题量",sheets:"生成张数",questionUnit:"题",sheetUnit:"张",answers:"打印答案页",
  worksheets:"A4 练习卷",totalQuestions:"总题量",currentMode:"当前配题方式",about:"约",minutes:"分",suggestedTime:"单张建议时间",repair:"重点修复",consolidate:"同技能巩固",review:"综合复习",shuffle:"↻ 换一批题",print:"打印纸张",download:"下载 PDF（推荐）",printNote:"下载 PDF 由服务器固定生成 A4 文件；直接打印纸张时请选择 A4、纵向、缩放 100%。",preview:"A4 计算练习卷预览",
  paperBrand:"国际数学竞赛训练中心 · 纸笔计算",name:"姓名",date:"日期",time:"用时",correct:"正确",paperFooter:"先独立完成，再对答案；错题请圈出，保留原始过程。",answerBrand:"国际数学竞赛训练中心 · 教师 / 家长核对页",answer:"答案",practiceCode:"练习编号",
  smartPersonal:"智能个性化",smartBalanced:"智能均衡巩固",chooseSkill:"请选择专项",gradeMixed:"年级综合训练",paperFocus:"本卷重点",allocation:"配题",weighted:"重点",balanced:"巩固",reviewWord:"复习",smartNoWeak:"最近没有形成稳定弱项，本卷不额外加权",smartNoData:"暂无该年级计算数据，本卷先按年级标准建立基础覆盖",teacherManual:"老师指定专项",gradeWeighted:"按本年级技能权重配题",
 },
 en:{
  paperTraining:"PAPER PRACTICE",title:"Batch A4 calculation worksheets",intro:"Generate personalized paper practice from this learner’s calculation history, or switch to grade-wide mixed practice or a teacher-selected skill.",back:"Back to calculation",personalized:"PERSONALIZED GENERATION",generateFor:"Generate for",
  noEvidence:"There is no calculation evidence for this grade yet. The system will not invent weaknesses; this batch uses balanced grade coverage until an online diagnostic provides evidence.",basedOn:"Based on the learner’s most recent",personalData:"questions. Each sheet uses approximately",mixRule:"60% targeted repair + 25% same-skill consolidation + 15% mixed review",focusSkill:"Focus skill",focusNode:"Efficient structure",balancedEvidence1:"The system reviewed the latest",balancedEvidence2:"questions but found no stable weakness. It will use balanced consolidation rather than overreacting to one slow or incorrect response.",autoOff:"Automatic personalization is off. ",manualOnly:"This batch uses only the teacher-selected skill.",mixedOnly:"This batch follows the grade-level skill weights.",
  grade:"Grade",mode:"Question mix",smart:"Personalized (default)",mixed:"Grade-wide mixed practice",manual:"Teacher-selected skill",skill:"Skill focus",questionsPerSheet:"Questions per sheet",sheets:"Number of sheets",questionUnit:"questions",sheetUnit:"sheets",answers:"Include answer pages",
  worksheets:"A4 worksheets",totalQuestions:"Total questions",currentMode:"Current mix",about:"About",minutes:"min",suggestedTime:"Suggested time per sheet",repair:"Targeted repair",consolidate:"Same-skill consolidation",review:"Mixed review",shuffle:"↻ Generate a new set",print:"Print sheets",download:"Download PDF (recommended)",printNote:"The server generates a fixed A4 PDF. For direct printing, use A4, portrait orientation and 100% scale.",preview:"A4 calculation worksheet preview",
  paperBrand:"Math Competition Lab · Calculation Practice",name:"Name",date:"Date",time:"Time",correct:"Correct",paperFooter:"Work independently first, then check answers. Circle errors and keep the original working.",answerBrand:"Math Competition Lab · Teacher / Parent Answer Page",answer:"Answers",practiceCode:"Practice code",
  smartPersonal:"Personalized",smartBalanced:"Balanced consolidation",chooseSkill:"Choose a skill",gradeMixed:"Grade-wide mixed practice",paperFocus:"Focus",allocation:"Mix",weighted:"repair",balanced:"consolidation",reviewWord:"review",smartNoWeak:"No stable weakness was detected in recent evidence, so this sheet is not additionally weighted",smartNoData:"No calculation evidence exists for this grade yet; this sheet starts with balanced grade-level coverage",teacherManual:"Teacher-selected skill",gradeWeighted:"uses the grade-level skill weights",
 },
} as const;

function printablePrompt(prompt:string,lang:SiteLang){
 return formatArithmeticDisplay(prompt.replace(/□/g,"______").replace(/\?（填小数）/g,lang==="zh"?"______（填小数）":"______ (decimal)").replace(/\?/g,"______"));
}
function gridClass(count:number){if(count<=40)return"print-question-grid cols-2";if(count<=60)return"print-question-grid cols-3";return"print-question-grid cols-4"}

export default function ArithmeticPrintClient({initialGrade,initialSeed,studentName,sessions,initialMode="smart",initialManualSkillId,initialQuestions,initialSheetCount=5,initialAnswers=true,initialLang,exportMode=false}:{
 initialGrade:ArithmeticGrade;initialSeed:number;studentName:string;sessions:ArithmeticSession[];initialMode?:ArithmeticPrintMode;initialManualSkillId?:string;initialQuestions?:number;initialSheetCount?:number;initialAnswers?:boolean;initialLang?:SiteLang;exportMode?:boolean;
}){
 const siteLang=useSiteLanguage(),lang=initialLang??siteLang,ui=UI[lang];
 const [grade,setGrade]=useState<ArithmeticGrade>(initialGrade);
 const [mode,setMode]=useState<ArithmeticPrintMode>(initialMode);
 const [manualSkillId,setManualSkillId]=useState(initialManualSkillId??GRADE_PROFILES[initialGrade].skills[0]?.id??"");
 const [questions,setQuestions]=useState<number>(initialQuestions??(initialGrade<=2?40:60));
 const [sheetCount,setSheetCount]=useState<number>(initialSheetCount);
 const [answers,setAnswers]=useState(initialAnswers);
 const [seed,setSeed]=useState(initialSeed);

 const profile=GRADE_PROFILES[grade],profileTitle=lang==="zh"?profile.titleZh:profile.titleEn;
 const plan=useMemo(()=>buildTrainingPlan(grade,sessions),[grade,sessions]);
 const evidenceQuestions=plan.metrics.reduce((sum,metric)=>sum+metric.attempts,0);
 const focusSkills=plan.focusSkills.map(id=>{const skill=profile.skills.find(x=>x.id===id);return lang==="zh"?skill?.labelZh:skill?.labelEn}).filter((label):label is string=>Boolean(label));
 const focusNodes=plan.focusNodes.map(node=>CLEVER_NODE_GUIDE[node][lang]);
 const hasSmartFocus=focusSkills.length>0||focusNodes.length>0;
 const manualSkill=profile.skills.find(skill=>skill.id===manualSkillId);
 const manualSkillLabel=manualSkill?(lang==="zh"?manualSkill.labelZh:manualSkill.labelEn):ui.chooseSkill;

 const worksheets=useMemo(()=>Array.from({length:sheetCount},(_,index)=>makeArithmeticWorksheet({grade,count:questions,seed:seed+index*10007,index,mode,manualSkillId:mode==="manual"?manualSkillId:undefined,plan})),[grade,questions,sheetCount,seed,mode,manualSkillId,plan]);
 const totalQuestions=questions*sheetCount;
 const estimatedMinutes=Math.max(1,Math.round((questions*profile.targetMedianMs)/60000));
 const firstMix=worksheets[0]?.mix??{repair:0,consolidate:0,review:0};

 const modeTitle=mode==="smart"?(hasSmartFocus?ui.smartPersonal:ui.smartBalanced):mode==="manual"?`${ui.teacherManual} · ${manualSkillLabel}`:ui.gradeMixed;
 const paperPlan=mode==="smart"?(hasSmartFocus?`${ui.smartPersonal} · ${ui.paperFocus}: ${[...focusSkills,...focusNodes].slice(0,4).join(" · ")} · ${ui.allocation} ${firstMix.repair} ${ui.weighted} + ${firstMix.consolidate} ${ui.balanced} + ${firstMix.review} ${ui.reviewWord}`:evidenceQuestions>0?`${ui.smartBalanced} · ${ui.smartNoWeak}`:`${ui.smartBalanced} · ${ui.smartNoData}`):mode==="manual"?`${ui.teacherManual} · ${manualSkillLabel}`:`${ui.gradeMixed} · ${ui.gradeWeighted}`;

 function changeGrade(next:ArithmeticGrade){setGrade(next);setManualSkillId(GRADE_PROFILES[next].skills[0]?.id??"");setQuestions(next<=2?40:60);setSeed(Date.now())}
 const pdfQuery=new URLSearchParams({grade:String(grade),mode,manualSkillId,questions:String(questions),sheets:String(sheetCount),answers:answers?"1":"0",seed:String(seed),lang}).toString();

 return <div className="print-workspace">
  <div className={`print-screen-shell screen-only${exportMode?" export-hidden":""}`}>
   <div className="print-screen-head"><div><span className="eyebrow">{ui.paperTraining}</span><h1>{ui.title}</h1><p>{ui.intro}</p></div><Link className="secondary-button" href="/arithmetic">{ui.back}</Link></div>

   <section className="personalized-print-card"><div><span className="eyebrow">{ui.personalized}</span><h2>{ui.generateFor} {studentName}</h2></div>{mode==="smart"?(evidenceQuestions===0?<p>{ui.noEvidence}</p>:hasSmartFocus?<div className="personalized-copy"><p>{ui.basedOn} <b>{evidenceQuestions}</b> {ui.personalData} <b>{ui.mixRule}</b>.</p><div className="personalized-chips">{focusSkills.map(label=><span key={`skill-${label}`}>{ui.focusSkill} · {label}</span>)}{focusNodes.map(label=><span key={`node-${label}`}>{ui.focusNode} · {label}</span>)}</div></div>:<p>{ui.balancedEvidence1} <b>{evidenceQuestions}</b> {ui.balancedEvidence2}</p>):<p>{ui.autoOff}{mode==="manual"?ui.manualOnly:ui.mixedOnly}</p>}</section>

   <section className="print-config-card">
    <label><span>{ui.grade}</span><select value={grade} onChange={e=>changeGrade(Number(e.target.value) as ArithmeticGrade)}>{([1,2,3,4,5,6,7,8,9,10,11,12] as ArithmeticGrade[]).map(g=><option key={g} value={g}>{lang==="zh"?GRADE_PROFILES[g].titleZh:GRADE_PROFILES[g].titleEn}</option>)}</select></label>
    <label><span>{ui.mode}</span><select value={mode} onChange={e=>setMode(e.target.value as ArithmeticPrintMode)}><option value="smart">{ui.smart}</option><option value="mixed">{ui.mixed}</option><option value="manual">{ui.manual}</option></select></label>
    {mode==="manual"&&<label><span>{ui.skill}</span><select value={manualSkillId} onChange={e=>setManualSkillId(e.target.value)}>{profile.skills.map(skill=><option key={skill.id} value={skill.id}>{lang==="zh"?skill.labelZh:skill.labelEn}</option>)}</select></label>}
    <label><span>{ui.questionsPerSheet}</span><select value={questions} onChange={e=>setQuestions(Number(e.target.value))}>{QUESTION_OPTIONS.map(count=><option key={count} value={count}>{count} {ui.questionUnit}</option>)}</select></label>
    <label><span>{ui.sheets}</span><select value={sheetCount} onChange={e=>setSheetCount(Number(e.target.value))}>{SHEET_OPTIONS.map(count=><option key={count} value={count}>{count} {ui.sheetUnit}</option>)}</select></label>
    <label className="print-answer-toggle"><input type="checkbox" checked={answers} onChange={e=>setAnswers(e.target.checked)}/><span>{ui.answers}</span></label>
   </section>

   <section className="print-summary-card"><div><strong>{sheetCount}</strong><span>{ui.worksheets}</span></div><div><strong>{totalQuestions}</strong><span>{ui.totalQuestions}</span></div><div><strong>{modeTitle}</strong><span>{ui.currentMode}</span></div><div><strong>{ui.about} {estimatedMinutes} {ui.minutes}</strong><span>{ui.suggestedTime}</span></div></section>
   {mode==="smart"&&hasSmartFocus&&<section className="print-mix-strip"><div><b>{firstMix.repair}</b><span>{ui.repair}</span></div><div><b>{firstMix.consolidate}</b><span>{ui.consolidate}</span></div><div><b>{firstMix.review}</b><span>{ui.review}</span></div></section>}
   <div className="print-toolbar"><button className="secondary-button" type="button" onClick={()=>setSeed(Date.now())}>{ui.shuffle}</button><button className="secondary-button" type="button" onClick={()=>window.print()}>{ui.print}</button><a className="primary-button" href={`/api/arithmetic/print/pdf?${pdfQuery}`}>{ui.download}</a></div>
   <p className="print-note">{ui.printNote}</p>
  </div>

  <div className="print-pages" aria-label={ui.preview}>
   {worksheets.map(sheet=><section className="a4-sheet exercise-sheet" key={sheet.code}><header className="paper-header"><div><span>{ui.paperBrand}</span><h2>{profileTitle} · {modeTitle}</h2></div><small>{sheet.code}</small></header><div className="paper-meta"><span>{ui.name}: <b>{studentName||"________"}</b></span><span>{ui.date}: ________</span><span>{ui.time}: ____ {ui.minutes} ____ s</span><span>{ui.correct}: ____ / {questions}</span></div><div className="paper-plan">{paperPlan}</div><div className={gridClass(questions)}>{sheet.items.map((item,idx)=><div className="print-question" key={item.id}><b>{idx+1}.</b><span>{printablePrompt(item.prompt,lang)}</span></div>)}</div><footer className="paper-footer"><span>{ui.paperFooter}</span><span>{sheet.index+1} / {sheetCount}</span></footer></section>)}
   {answers&&worksheets.map(sheet=><section className="a4-sheet answer-sheet" key={`answer-${sheet.code}`}><header className="paper-header"><div><span>{ui.answerBrand}</span><h2>{ui.answer} · {profileTitle} · {modeTitle}</h2></div><small>{sheet.code}</small></header><div className="answer-warning">{paperPlan}</div><div className="answer-grid">{sheet.items.map((item,idx)=><div key={item.id}><b>{idx+1}.</b><span>{formatArithmeticDisplay(item.answer)}</span></div>)}</div><footer className="paper-footer"><span>{ui.practiceCode}: {sheet.code}</span><span>{ui.answer} {sheet.index+1} / {sheetCount}</span></footer></section>)}
  </div>
 </div>;
}
