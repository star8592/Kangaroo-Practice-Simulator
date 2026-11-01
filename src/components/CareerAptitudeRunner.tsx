"use client";

import {useEffect,useState,useSyncExternalStore} from "react";
import {
 APTITUDE_VERSION,APTITUDE_DURATION_MINUTES,APTITUDE_ITEMS,APTITUDE_DOMAINS,
 scoreAptitude,type AptitudeReport,
} from "@/lib/career-aptitude-bank";
import styles from "@/app/assessment-center/measurement.module.css";

type Stage="intro"|"questions"|"review"|"report";
type Saved={
 version:typeof APTITUDE_VERSION;stage:Exclude<Stage,"intro">;
 answers:Record<string,number>;flagged:Record<string,boolean>;
 index:number;deadline:number;timedOut:boolean;
};
const KEY="socthink:career-aptitude:"+APTITUDE_VERSION;
const TOTAL=APTITUDE_ITEMS.length;
const INITIAL_TIME=APTITUDE_DURATION_MINUTES*60;
function remainingText(s:number){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}

const noNotifications=()=>()=>{};
const clientReady=()=>true;
const serverNotReady=()=>false;
function readAttempt():Saved|null{
 if(typeof window==="undefined")return null;
 try{
  const raw=sessionStorage.getItem(KEY);
  if(!raw)return null;
  const saved=JSON.parse(raw) as Saved;
  const validAnswers=Object.entries(saved.answers||{}).every(([id,v])=>
    APTITUDE_ITEMS.some(q=>q.id===id)&&Number.isInteger(v)&&v>=0&&v<=3);
  const validStage=["questions","review","report"].includes(saved.stage);
  if(saved.version!==APTITUDE_VERSION||!validAnswers||!validStage
    ||!Number.isInteger(saved.index)||saved.index<0||saved.index>=TOTAL
    ||!Number.isFinite(saved.deadline)||saved.deadline<=0)return null;
  const expired=saved.deadline<=Date.now()&&saved.stage!=="report";
  return expired?{...saved,stage:"report",timedOut:true}:saved;
 }catch{return null;}
}
export default function CareerAptitudeRunner(){
 const hydrated=useSyncExternalStore(noNotifications,clientReady,serverNotReady);
 const [initial]=useState<Saved|null>(readAttempt);
 const[stage,setStage]=useState<Stage>(initial?.stage??"intro");
 const[accepted,setAccepted]=useState(false);
 const[answers,setAnswers]=useState<Record<string,number>>(initial?.answers??{});
 const[flagged,setFlagged]=useState<Record<string,boolean>>(initial?.flagged??{});
 const[index,setIndex]=useState(initial?.index??0);
 const[deadline,setDeadline]=useState(initial?.deadline??0);
 const[seconds,setSeconds]=useState(INITIAL_TIME);
 const[timedOut,setTimedOut]=useState(Boolean(initial?.timedOut));
 useEffect(()=>{
  if(!hydrated)return;
  if(stage==="intro"){try{sessionStorage.removeItem(KEY)}catch{};return;}
  const data:Saved={version:APTITUDE_VERSION,stage,answers,flagged,index,deadline,timedOut};
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
 const item=APTITUDE_ITEMS[index];
 const answered=APTITUDE_ITEMS.filter(q=>answers[q.id]!==undefined).length;
 const marked=APTITUDE_ITEMS.filter(q=>Boolean(flagged[q.id])).length;
 const domain=APTITUDE_DOMAINS.find(d=>d.id===item.domain)!;
 const report: AptitudeReport|null=stage==="report"?scoreAptitude(answers):null;
 const firstUnanswered=APTITUDE_ITEMS.findIndex(q=>answers[q.id]===undefined);
 const firstMarked=APTITUDE_ITEMS.findIndex(q=>Boolean(flagged[q.id]));
 function start(){
  if(!accepted)return;
  const due=Date.now()+INITIAL_TIME*1000;
  setAnswers({});setFlagged({});setIndex(0);setTimedOut(false);
  setSeconds(INITIAL_TIME);setDeadline(due);setStage("questions");
 }
 function openQuestion(i:number){setIndex(Math.max(0,Math.min(TOTAL-1,i)));setStage("questions");}
 function reset(){try{sessionStorage.removeItem(KEY)}catch{};setStage("intro");setAccepted(false);setAnswers({});setFlagged({});setIndex(0);setDeadline(0);setSeconds(INITIAL_TIME);setTimedOut(false);}
 const grid=<div className={styles.answerGrid} role="group" aria-label="题号答题卡">
  {APTITUDE_ITEMS.map((q,i)=><button key={q.id} type="button" onClick={()=>openQuestion(i)}
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
   <span className={styles.eyebrowDark}>SOCTHINK · 原创招聘模拟卷 / 2026.11</span>
   <h1>招聘通用能力 · 40题</h1>
   <div className={styles.labels}>
    <span>5类能力</span><span>45分钟</span>
    <span>免费训练与真实错题解析</span><span>非官方、非标准化测验</span>
   </div>
  </header>
  {stage==="intro"&&<section className={styles.panel} aria-label="模拟考试入场">
   <h2>模拟考试入场</h2>
   <p className={styles.lead}>40题 · 45分钟 · 单选。考查言语、数量、逻辑、资料分析和空间推理。</p>
   <div className={styles.aptitudeSummary}>
    {APTITUDE_DOMAINS.map(d=><div key={d.id}><strong>{d.title}</strong><span>8题</span></div>)}
   </div>
   <p className={styles.smallNote}>开始后本标签页倒计时；允许跳题与标记，交卷前可检查，时间到自动提交。未答题计0分。本训练不监考，不构成正式招聘成绩或心理能力认证。</p>
   <label className={styles.consent}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>我理解这是本站原创练习卷，计时45分钟。</label>
   <div className={styles.controls}><button type="button" className={styles.primaryButton} disabled={!accepted} onClick={start}>确认入场 · 开始模拟</button></div>
   <details className={styles.evidenceToggle}>
    <summary>试题来源与成绩解释</summary>
    <p>全部题目为SOCTHINK原创的求职训练任务，版本：{APTITUDE_VERSION}。分类参考国内招聘测试的常见领域，而非引用、转录北森、牛客或某企业的受保护原题。</p>
    <p>评分为每题1分、答错及空白0分；显示本卷实际答对题数和逐题解析，不使用未经验证的全国百分位、智商或企业录取概率。</p>
    <p>选择与考试状态仅保存在当前浏览器标签页的会话存储中；不上传到服务器，不在微信账号里生成跨设备成绩记录。</p>
   </details>
  </section>}
  {(stage==="questions"||stage==="review")&&<section className={styles.panel} aria-label="招聘通用能力作答">
   <div className={styles.aptitudeExamBar}>
    <div><strong>已答 {answered}/{TOTAL}</strong><span>待复查 {marked} · 未答 {TOTAL-answered}</span></div>
    <div className={seconds<=300?styles.aptitudeTimeDanger:styles.aptitudeTime} role="timer" aria-label="剩余时间">{remainingText(seconds)}</div>
   </div>
   <div className={styles.progress} role="progressbar" aria-label="已答题数" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={answered}>
    <span style={{width:(answered/TOTAL*100)+"%"}}/>
   </div>
   {stage==="questions"&&<>
    <div className={styles.aptitudeQuestionTop}>
     <span>第 {index+1} / {TOTAL} 题 · {domain.title} · {item.difficulty}</span>
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
    <p className={styles.smallNote}>已答 {answered} 题 · 未答 {TOTAL-answered} 题 · 标记复查 {marked} 题。确认后不能修改，本卷不设空题强制补答。</p>
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
   <p className={styles.lead}>答对 <strong>{report.correct} / {report.total}</strong> 题，已作答 {report.answered} 题。分数仅反映这套原创训练卷的完成情况，不代表全国排名或招聘录取概率。</p>
   <div className={styles.scoreList}>{report.groups.map(d=><div key={d.id} className={styles.score}>
    <div className={styles.scoreTop}><strong>{d.title}</strong><span>{d.correct} <small>/ {d.total}</small></span></div>
    <div className={styles.scoreTrack}><span style={{width:(d.correct/d.total*100)+"%"}}/></div>
    <p>{d.advice}</p>
   </div>)}</div>
   <details className={styles.aptitudeReviewDetails}>
    <summary>查看40题逐题解析与原始作答</summary>
    <ol className={styles.reviewList}>{report.results.map((r,i)=>{
     const q=APTITUDE_ITEMS[i];
     return <li key={r.id} className={styles.reviewItem}>
      <strong>第{i+1}题 · {APTITUDE_DOMAINS.find(d=>d.id===q.domain)?.title} · {r.chosen===null?"未作答":r.correct?"正确":"需复盘"}</strong>
      <p>{q.stem}</p>
      <p>你的作答：{r.chosen===null?"未答":String.fromCharCode(65+r.chosen)+" "+q.options[r.chosen]}</p>
      <p>正确选项：{String.fromCharCode(65+r.answer)} {q.options[r.answer]}</p>
      <p>{r.explanation}</p>
     </li>;
    })}</ol>
   </details>
   <div className={styles.reportFoot}><strong>评分与报告边界</strong>
    <p>原创训练题 · 固定40题 · 每题1分。暂未进行大样本难度校准、信效度与地区/年龄常模研究。本页面不提供IQ、潜能等级、企业适岗预测或官方考试凭证。</p>
   </div>
   <div className={styles.controls}>
    <button type="button" className={styles.secondaryButton} onClick={reset}>重新模拟</button>
    <button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印本次成绩</button>
   </div>
  </section>}
 </div>;
}
