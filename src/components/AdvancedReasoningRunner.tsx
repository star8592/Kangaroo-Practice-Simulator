"use client";

import {useEffect,useState,useSyncExternalStore} from "react";
import {
 ADVANCED_REASONING_VERSION,ADVANCED_REASONING_DURATION_MINUTES,ADVANCED_REASONING_ITEMS,ADVANCED_REASONING_DOMAINS,
 scoreAdvancedReasoning,type AdvancedReasoningReport,
} from "@/lib/advanced-reasoning-bank";
import styles from "@/app/assessment-center/measurement.module.css";
import AssessmentExamIdentity from "@/components/AssessmentExamIdentity";
import AssessmentTrustBrief from "@/components/AssessmentTrustBrief";

type Stage="intro"|"questions"|"review"|"report";
type Saved={
 version:typeof ADVANCED_REASONING_VERSION;stage:Exclude<Stage,"intro">;
 answers:Record<string,number>;flagged:Record<string,boolean>;
 index:number;deadline:number;timedOut:boolean;
};
const KEY="socthink:advanced-reasoning:"+ADVANCED_REASONING_VERSION;
const TOTAL=ADVANCED_REASONING_ITEMS.length;
const INITIAL_TIME=ADVANCED_REASONING_DURATION_MINUTES*60;
function remainingText(s:number){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}

const noNotifications=()=>()=>{};
const clientReady=()=>true;
const serverNotReady=()=>false;
type Recovered=Saved&{remainingSeconds:number};
function readAttempt():Recovered|null{
 if(typeof window==="undefined")return null;
 try{
  const raw=sessionStorage.getItem(KEY);
  if(!raw)return null;
  const saved=JSON.parse(raw) as Saved;
  const validAnswers=Object.entries(saved.answers||{}).every(([id,v])=>
    ADVANCED_REASONING_ITEMS.some(q=>q.id===id)&&Number.isInteger(v)&&v>=0&&v<=3);
  const validStage=["questions","review","report"].includes(saved.stage);
  if(saved.version!==ADVANCED_REASONING_VERSION||!validAnswers||!validStage
    ||!Number.isInteger(saved.index)||saved.index<0||saved.index>=TOTAL
    ||!Number.isFinite(saved.deadline)||saved.deadline<=0)return null;
  const now=Date.now();
  const expired=saved.deadline<=now&&saved.stage!=="report";
  const remainingSeconds=Math.max(0,Math.ceil((saved.deadline-now)/1000));
  return expired?{...saved,stage:"report",timedOut:true,remainingSeconds}:
    {...saved,remainingSeconds};
 }catch{return null;}
}
export default function AdvancedReasoningRunner(){
 const hydrated=useSyncExternalStore(noNotifications,clientReady,serverNotReady);
 const [initial]=useState<Recovered|null>(readAttempt);
 const[stage,setStage]=useState<Stage>(initial?.stage??"intro");
 const[accepted,setAccepted]=useState(false);
 const[answers,setAnswers]=useState<Record<string,number>>(initial?.answers??{});
 const[flagged,setFlagged]=useState<Record<string,boolean>>(initial?.flagged??{});
 const[index,setIndex]=useState(initial?.index??0);
 const[deadline,setDeadline]=useState(initial?.deadline??0);
 const[seconds,setSeconds]=useState(initial?.remainingSeconds??INITIAL_TIME);
 const[timedOut,setTimedOut]=useState(Boolean(initial?.timedOut));
 useEffect(()=>{
  if(!hydrated)return;
  if(stage==="intro"){try{sessionStorage.removeItem(KEY)}catch{};return;}
  const data:Saved={version:ADVANCED_REASONING_VERSION,stage,answers,flagged,index,deadline,timedOut};
  try{sessionStorage.setItem(KEY,JSON.stringify(data))}catch{}
 },[hydrated,stage,answers,flagged,index,deadline,timedOut]);
 useEffect(()=>{
  if(!hydrated||!(stage==="questions"||stage==="review")||!deadline)return;
  const tick=()=>{
   const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
   setSeconds(remaining);
   if(remaining===0){setTimedOut(true);setStage("report");}
  };
  const timer=setInterval(tick,1000);return()=>clearInterval(timer);
 },[hydrated,stage,deadline]);
 const item=ADVANCED_REASONING_ITEMS[index];
 const answered=ADVANCED_REASONING_ITEMS.filter(q=>answers[q.id]!==undefined).length;
 const marked=ADVANCED_REASONING_ITEMS.filter(q=>Boolean(flagged[q.id])).length;
 const domain=ADVANCED_REASONING_DOMAINS.find(d=>d.id===item.domain)!;
 const report: AdvancedReasoningReport|null=stage==="report"?scoreAdvancedReasoning(answers):null;
 const firstUnanswered=ADVANCED_REASONING_ITEMS.findIndex(q=>answers[q.id]===undefined);
 const firstMarked=ADVANCED_REASONING_ITEMS.findIndex(q=>Boolean(flagged[q.id]));
 // The report is a transparent exercise summary, not a psychological score.
 const revisionDomains=report?.groups.filter(d=>d.answered>d.correct)
  .sort((a,b)=>(b.answered-b.correct)-(a.answered-a.correct)).slice(0,2)??[];
 const wrongExamples=report?.review.map((r,i)=>({result:r,item:ADVANCED_REASONING_ITEMS[i],number:i+1}))
  .filter(x=>x.result.chosen!==null&&!x.result.correct).slice(0,3)??[];
 function start(){
  if(!accepted)return;
  const due=Date.now()+INITIAL_TIME*1000;
  setAnswers({});setFlagged({});setIndex(0);setTimedOut(false);
  setSeconds(INITIAL_TIME);setDeadline(due);setStage("questions");
 }
 function openQuestion(i:number){setIndex(Math.max(0,Math.min(TOTAL-1,i)));setStage("questions");}
 function reset(){try{sessionStorage.removeItem(KEY)}catch{};setStage("intro");setAccepted(false);setAnswers({});setFlagged({});setIndex(0);setDeadline(0);setSeconds(INITIAL_TIME);setTimedOut(false);}
 const grid=<div className={styles.answerGrid} role="group" aria-label="题号答题卡">
  {ADVANCED_REASONING_ITEMS.map((q,i)=><button key={q.id} type="button" onClick={()=>openQuestion(i)}
   aria-current={index===i&&stage==="questions"?"step":undefined}
   aria-label={"第"+(i+1)+"题，"+(answers[q.id]===undefined?"未答":"已答")+(flagged[q.id]?"，已标记":"")}
   className={(answers[q.id]!==undefined?styles.answered:"")+
    (flagged[q.id]?" "+styles.marked:"")+
    (stage==="questions"&&index===i?" "+styles.current:"")}>
   {i+1}</button>)}
 </div>;
 if(!hydrated)return <div className={styles.runner}><p className={styles.smallNote}>正在读取本次模拟卷…</p></div>;
 return <div className={styles.runner}>
  <header className={styles.runnerHeader+" "+styles.compactHeader}>
   <span className={styles.eyebrowDark}>SOCTHINK · 原创高级逻辑模拟卷 / 2026.11</span>
   <h1>高级逻辑与批判性推理 · 40题</h1>
   <div className={styles.labels}>
    <span>5类推理</span><span>45分钟</span>
    <span>免费训练与真实错题解析</span><span>非官方、非标准化测验</span>
   </div>
  </header>
  {stage==="intro"&&<section className={styles.panel} aria-label="模拟考试入场">
   <h2>模拟考试入场</h2>
   <AssessmentTrustBrief variant="advanced" assessmentId="advanced-reasoning-40"/>
   <p className={styles.lead}>40题 · 45分钟 · 单选。涵盖演绎推理、条件约束、规律归纳、隐含假设与证据评价。</p>
   <div className={styles.aptitudeSummary}>
    {ADVANCED_REASONING_DOMAINS.map(d=><div key={d.id}><strong>{d.name}</strong><span>8题</span></div>)}
   </div>
   <p className={styles.smallNote}>开始后本标签页倒计时；允许跳题与标记，交卷前可检查，时间到自动提交。未答题计0分。本训练仅面向成年学习者，无监考，不构成正式招聘测量、IQ或心理诊断。</p>
   <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>我已年满18岁，理解这是本站原创非标准化练习卷，计时45分钟。</label>
   <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!accepted} onClick={start}>确认入场 · 开始模拟</button></div>
   <details className={styles.evidenceToggle}>
    <summary>试题来源与成绩解释</summary>
    <p>全部题目为SOCTHINK原创的高级推理与论证训练任务，版本：{ADVANCED_REASONING_VERSION}。分类参考推理测评公开方法的常见领域，而非引用、转录SHL、Watson-Glaser、OPM或某机构的受保护题目。</p>
    <p>评分为每题1分、答错及空白0分；显示本卷实际答对题数和逐题解析，不使用未经验证的全国百分位、智商或企业录取概率。</p>
    <p>本次答案和剩余时间只保存在当前浏览器标签页的会话存储中，刷新可在同一标签页恢复；不上传服务器或建立跨设备用户画像。</p>
   </details>
  </section>}
  {(stage==="questions"||stage==="review")&&<section className={styles.panel} aria-label="高级逻辑试卷作答">
   <AssessmentExamIdentity assessmentId="advanced-reasoning-40" mode="task"/>
   <div className={styles.aptitudeExamBar}>
    <div><strong>已答 {answered}/{TOTAL}</strong><span>待复查 {marked} · 未答 {TOTAL-answered}</span></div>
    <div className={seconds<=300?styles.aptitudeTimeDanger:styles.aptitudeTime} role="timer" aria-label="剩余时间">{remainingText(seconds)}</div>
   </div>
   <div className={styles.progress} role="progressbar" aria-label="已答题数" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={answered}>
    <span style={{width:(answered/TOTAL*100)+"%"}}/>
   </div>
   {stage==="questions"&&<>
    <div className={styles.aptitudeQuestionTop}>
     <span>第 {index+1} / {TOTAL} 题 · {domain.name} · {item.difficulty}</span>
     <button type="button" className={flagged[item.id]?styles.flagActive:styles.flagButton}
      aria-pressed={Boolean(flagged[item.id])}
      onClick={()=>setFlagged(prev=>({...prev,[item.id]:!prev[item.id]}))}>
       {flagged[item.id]?"★ 已标记":"☆ 标记复查"}
     </button>
    </div>
    <fieldset className={styles.question}>
     <legend>{item.stem}</legend>
     <div className={styles.choices}>{item.options.map((option,i)=><label key={i}
       className={answers[item.id]===i?styles.choiceActive:styles.choice}>
      <input type="radio" name={"aptitude-"+item.id} checked={answers[item.id]===i} onChange={()=>setAnswers(a=>({...a,[item.id]:i}))}/>
      <span className={styles.choiceNum}>{String.fromCharCode(65+i)}</span><span>{option}</span>
     </label>)}</div>
    </fieldset>
    <details className={styles.answerNav}><summary>答题卡 · 已答 {answered}/{TOTAL} · 点选题号跳转</summary>{grid}
     <p className={styles.answerHint}>深蓝：当前题 · 浅蓝：已答 · 黄点：待复查。不会自动交卷。</p>
    </details>
    <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} disabled={index===0} onClick={()=>openQuestion(index-1)}>上一题</button>
     {index===TOTAL-1
      ?<button type="button" className={styles.primaryButton} onClick={()=>setStage("review")}>检查交卷</button>
      :<button type="button" className={styles.primaryButton} onClick={()=>openQuestion(index+1)}>下一题</button>}
    </div>
    <button type="button" className={styles.aptitudeReviewLink} onClick={()=>setStage("review")}>答题总览 / 提前交卷</button>
   </>}
   {stage==="review"&&<>
    <h2>交卷前检查</h2>
    <p className={styles.smallNote}>已答 {answered} 题 · 未答 {TOTAL-answered} 题 · 标记复查 {marked} 题。确认后不能修改，本卷允许留空交卷。</p>
    {grid}
    <div className={styles.aptitudeWarning}>未答题按0分计入原始成绩。请在确认前核对全部题目。</div>
    <div className={styles.controls}>
     <button type="button" className={styles.secondaryButton} onClick={()=>openQuestion(firstUnanswered>=0?firstUnanswered:firstMarked>=0?firstMarked:index)}>
      {firstUnanswered>=0?"检查未答题":firstMarked>=0?"检查标记题":"返回检查"}
     </button>
     <button type="button" className={styles.primaryButton} onClick={()=>setStage("report")}>确认交卷 · 查看成绩</button>
    </div>
   </>}
  </section>}
  {stage==="report"&&report&&<section className={styles.panel} aria-label="模拟考试成绩">
   <div className={styles.reportTitle}><div><span className={styles.eyebrowDark}>ORIGINAL MOCK · {report.version}</span><h2>本次模拟成绩</h2></div><span className={styles.previewBadge}>原始答题成绩</span></div>
   {timedOut&&<p className={styles.aptitudeWarning}>考试计时结束，系统按已经保存在本标签页的答案自动交卷。</p>}
   <p className={styles.lead}>答对 <strong>{report.correct} / {report.total}</strong> 题，已作答 {report.answered} 题。分数仅反映这套原创推理训练卷的完成情况，不代表全国排名或招聘录取概率。</p>
   <section className={styles.reportSummary} aria-label="答卷完整性与成绩解释">
    <h3>01 · 答卷概况</h3>
    <dl className={styles.reportStatGrid}>
     <div><dt>原始总成绩</dt><dd>{report.correct} / {report.total}</dd></div>
     <div><dt>完成题目</dt><dd>{report.answered} / {report.total}</dd></div>
     <div><dt>未答题目</dt><dd>{report.total-report.answered}</dd></div>
     <div><dt>已答题准确率</dt><dd>{report.answered?Math.round(report.correct/report.answered*100)+"%":"未形成"}</dd></div>
    </dl>
    <p>{report.answered===0
      ?"本次交白卷，只有空白记录，不能据此判断推理能力。"
      :report.answered<report.total
       ?"存在未答题：总成绩将空白计0分；已答准确率仅在已作答题中计算，不可当作完整能力指标。"
       :"已完成全卷；成绩仍只代表这40道训练题的本次表现，不是与其他人的能力比较。"}</p>
   </section>
   <h3 className={styles.reportSectionHeading}>02 · 五项任务表现</h3>
   <div className={styles.scoreList}>{report.groups.map(d=><div key={d.id} className={styles.score}>
    <div className={styles.scoreTop}><strong>{d.name}</strong><span>{d.correct} <small>/ {d.total}</small></span></div>
    <div className={styles.scoreTrack}><span style={{width:(d.correct/d.total*100)+"%"}}/></div>
    <p>{d.practice}</p>
   </div>)}</div>
   <section className={styles.reportSummary} aria-label="针对本次错题的训练建议">
    <h3>03 · 证据复盘与下一步训练</h3>
    {report.answered===0?<p>没有已作答题，无法识别具体错误模式。建议完整完成试卷后再查看复盘建议。</p>:
     wrongExamples.length===0?<p>本次已作答题没有错题。建议检查未答题，并通过不同题目的新卷验证掌握情况；不能据此判定推理能力等级。</p>:<>
      <p>以下仅依据本次答题记录给出复盘优先顺序，不将每类8道题的分数解释为稳定的能力强弱。</p>
      <div className={styles.reportRevisionGrid}>
       {revisionDomains.map(d=><div key={d.id}>
        <strong>{d.name}</strong>
        <p>已答 {d.answered}/8 · 错题 {d.answered-d.correct} 道</p>
        <p>{d.practice}</p>
       </div>)}
      </div>
      <h4>选取的错题证据</h4>
      <ul className={styles.reportEvidenceList}>
       {wrongExamples.map(x=><li key={x.result.id}>
        <strong>第 {x.number} 题 · {ADVANCED_REASONING_DOMAINS.find(d=>d.id===x.item.domain)?.name}</strong>
        <span>你选 {String.fromCharCode(65+x.result.chosen!)}，正确答案为 {String.fromCharCode(65+x.result.answer)}。{x.item.explanation}</span>
       </li>)}
      </ul>
      <p><strong>训练建议：</strong>今天逐题复述推理链；次日用不同案例练习相同方法；一周后用新题复测。进步判断应比较多次新题表现，而非重复记住这一卷答案。</p>
     </>}
   </section>
   <h3 className={styles.reportSectionHeading}>04 · 40题作答证据</h3>
   <details className={styles.aptitudeReviewDetails}>
    <summary>查看40题逐题解析与原始作答</summary>
    <ol className={styles.reviewList}>{report.review.map((r,i)=>{
     const q=ADVANCED_REASONING_ITEMS[i];
     return <li key={r.id} className={styles.reviewItem}>
      <strong>第{i+1}题 · {ADVANCED_REASONING_DOMAINS.find(d=>d.id===q.domain)?.name} · {r.chosen===null?"未作答":r.correct?"正确":"需复盘"}</strong>
      <p>{q.stem}</p>
      <p>你的作答：{r.chosen===null?"未答":String.fromCharCode(65+r.chosen)+" "+q.options[r.chosen]}</p>
      <p>正确选项：{String.fromCharCode(65+r.answer)} {q.options[r.answer]}</p>
      <p>{r.explanation}</p>
     </li>;
    })}</ol>
   </details>
   <div className={styles.reportFoot}><strong>05 · 方法、版本与报告边界</strong>
    <p>开发方：SOCTHINK · 卷版本：{report.version} · 计分：答对1分，答错或空白0分 · 适用：18岁及以上成人训练。<a href="/assessment-center/methodology#advanced-reasoning-40">查阅公开技术档案</a></p>
    <p>原创训练题 · 固定40题 · 每题1分。尚未开展大样本题目难度校准、信效度或地区/年龄常模研究。本页面不提供IQ、潜能等级、企业适岗预测或官方考试凭证。</p>
   </div>
   <div className={styles.controls}>
    <button type="button" className={styles.secondaryButton} onClick={reset}>重新模拟</button>
    <button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印本次成绩</button>
   </div>
  </section>}
 </div>;
}
