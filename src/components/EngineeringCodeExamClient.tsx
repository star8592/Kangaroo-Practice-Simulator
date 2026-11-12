"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {KeyboardEvent} from "react";
import {ENGINEERING_MOCK_ITEMS,ENGINEERING_MOCK_MINUTES,ENGINEERING_MOCK_QUESTIONS,ENGINEERING_MOCK_VERSION,summarizeEngineeringMock} from "@/lib/engineering-code-exam";
import type {CodeExamMark} from "@/lib/engineering-code-exam";
import {indentCodeSource} from "@/lib/code-lab-session";
import workspace from "./code-lab.module.css";
import styles from "./engineering-code-exam.module.css";

type Stage="intro"|"exam"|"review"|"grading"|"report";
type Saved={
 version:string;stage:"exam"|"review"|"report";deadline:number;index:number;
 drafts:Record<string,string>;flagged:Record<string,boolean>;marks:CodeExamMark[];
};
type WorkerReply=
 | {requestId:string;type:"sample";result:{correct:boolean;message:string}}
 | {requestId:string;type:"progress";completed:number;total:number}
 | {requestId:string;type:"complete";marks:CodeExamMark[]}
 | {requestId:string;type:"error";error:string};
const STORAGE_KEY="socthink:engineering-code-mock:"+ENGINEERING_MOCK_VERSION;
const noNotifications=()=>()=>{};
const clientReady=()=>true;
const serverNotReady=()=>false;
const itemIds:Set<string>=new Set(ENGINEERING_MOCK_ITEMS.map(q=>q.id));
function readSaved():Saved|null{
 if(typeof window==="undefined")return null;
 try{
  const raw=sessionStorage.getItem(STORAGE_KEY);
  if(!raw||raw.length>40000)return null;
  const s=JSON.parse(raw) as Saved;
  if(s.version!==ENGINEERING_MOCK_VERSION||!["exam","review","report"].includes(s.stage)
    ||!Number.isInteger(s.index)||s.index<0||s.index>=ENGINEERING_MOCK_ITEMS.length
    ||!Number.isFinite(s.deadline)||s.deadline<1||s.deadline>Date.now()+3600000
    ||!s.drafts||typeof s.drafts!=="object"||Array.isArray(s.drafts)
    ||!s.flagged||typeof s.flagged!=="object"||Array.isArray(s.flagged)
    ||!Array.isArray(s.marks))return null;
  if(Object.entries(s.drafts).some(([id,value])=>!itemIds.has(id)||typeof value!=="string"||value.length>5000))return null;
  if(Object.entries(s.flagged).some(([id,value])=>!itemIds.has(id)||typeof value!=="boolean"))return null;
  if(s.marks.some(m=>!itemIds.has(m.id)||!Number.isInteger(m.passed)||m.passed<0||m.passed>4||m.total!==4))return null;
  if(s.stage==="report"&&s.marks.length!==ENGINEERING_MOCK_ITEMS.length)return null;
  return s;
 }catch{return null;}
}
const secondsText=(seconds:number)=>{
 const m=Math.floor(seconds/60);
 const s=seconds%60;
 return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");
};
export default function EngineeringCodeExamClient(){
 const hydrated=useSyncExternalStore(noNotifications,clientReady,serverNotReady);
 const [initial]=useState(readSaved);
 const[stage,setStage]=useState<Stage>(initial?.stage??"intro");
 const[consent,setConsent]=useState(false);
 const[index,setIndex]=useState(initial?.index??0);
 const[deadline,setDeadline]=useState(initial?.deadline??0);
 const[seconds,setSeconds]=useState(()=>initial?Math.max(0,Math.ceil((initial.deadline-Date.now())/1000)):ENGINEERING_MOCK_MINUTES*60);
 const[drafts,setDrafts]=useState<Record<string,string>>(initial?.drafts??{});
 const[flagged,setFlagged]=useState<Record<string,boolean>>(initial?.flagged??{});
 const[marks,setMarks]=useState<CodeExamMark[]>(initial?.marks??[]);
 const[notice,setNotice]=useState("");
 const[sampleBusy,setSampleBusy]=useState(false);
 const[sampleResult,setSampleResult]=useState<{correct:boolean;message:string}|null>(null);
 const[progress,setProgress]=useState(0);
 const[expanded,setExpanded]=useState(false);
 const worker=useRef<Worker|null>(null);
 const timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const submitting=useRef(false);
 const submitLatest=useRef<()=>void>(()=>{});
 const question=ENGINEERING_MOCK_QUESTIONS[index];
 const currentDraft=drafts[question.id]??question.task.starter;
 const answered=(q:typeof question)=>Boolean(drafts[q.id]?.trim()&&drafts[q.id]!==q.task.starter);
 const answeredCount=ENGINEERING_MOCK_QUESTIONS.filter(answered).length;
 function cleanup(){
  worker.current?.terminate();worker.current=null;
  if(timeout.current)clearTimeout(timeout.current);
  timeout.current=null;
 }
 useEffect(()=>()=>{worker.current?.terminate();if(timeout.current)clearTimeout(timeout.current);},[]);
 useEffect(()=>{
  if(!hydrated)return;
  try{
   if(stage==="intro")sessionStorage.removeItem(STORAGE_KEY);
   else sessionStorage.setItem(STORAGE_KEY,JSON.stringify({
    version:ENGINEERING_MOCK_VERSION,stage:stage==="grading"?"review":stage,
    deadline,index,drafts,flagged,marks
   }));
  }catch{/* browser can disable local storage; exam remains usable in this tab */}
 },[hydrated,stage,deadline,index,drafts,flagged,marks]);
 function begin(){
  cleanup();submitting.current=false;setIndex(0);
  setDeadline(Date.now()+ENGINEERING_MOCK_MINUTES*60*1000);
  setSeconds(ENGINEERING_MOCK_MINUTES*60);
  setDrafts({});setFlagged({});setMarks([]);setNotice("");setSampleResult(null);setExpanded(false);
  setStage("exam");
 }
 function sample(){
  if(sampleBusy||submitting.current||seconds<=0)return;
  const source=currentDraft;
  setSampleBusy(true);setSampleResult(null);setNotice("");
  cleanup();
  const w=new Worker(new URL("../workers/engineering-exam.worker.ts",import.meta.url),{type:"module"});
  worker.current=w;
  const requestId="sample-"+question.id+"-"+Date.now();
  w.onmessage=(event:MessageEvent<WorkerReply>)=>{
   if(event.data.requestId!==requestId)return;
   cleanup();setSampleBusy(false);
   if(event.data.type==="sample")setSampleResult(event.data.result);
   else if(event.data.type==="error")setNotice("运行失败："+event.data.error);
  };
  w.onerror=()=>{cleanup();setSampleBusy(false);setNotice("隔离代码执行器未能启动。");};
  timeout.current=setTimeout(()=>{
   cleanup();setSampleBusy(false);setNotice("公开样例运行超时，已安全终止。");
  },12000);
  w.postMessage({requestId,mode:"sample",id:question.id,source});
 }
 function submit(){
  if(submitting.current||stage==="report"||stage==="grading"||stage==="intro")return;
  submitting.current=true;cleanup();
  setSampleBusy(false);setNotice("");setStage("grading");setProgress(0);
  try{
   const w=new Worker(new URL("../workers/engineering-exam.worker.ts",import.meta.url),{type:"module"});
   worker.current=w;
   const requestId="submission-"+Date.now();
   w.onmessage=(event:MessageEvent<WorkerReply>)=>{
    if(event.data.requestId!==requestId)return;
    if(event.data.type==="progress"){setProgress(event.data.completed);return;}
    if(event.data.type==="complete"){
     cleanup();submitting.current=false;setMarks(event.data.marks);setStage("report");return;
    }
    if(event.data.type==="error"){
     cleanup();submitting.current=false;setNotice("判分失败："+event.data.error+"。可重新交卷。");setStage("review");
    }
   };
   w.onerror=()=>{cleanup();submitting.current=false;setNotice("判分环境启动失败，请重新提交。");setStage("review");};
   timeout.current=setTimeout(()=>{
    cleanup();submitting.current=false;setNotice("判分运行超时，可再次提交；当前草稿已保留。");setStage("review");
   },45000);
   w.postMessage({requestId,mode:"submit",drafts});
  }catch{
   cleanup();submitting.current=false;setNotice("无法启动隔离判分器。");setStage("review");
  }
 }
 useEffect(()=>{submitLatest.current=submit;});
 useEffect(()=>{
  if(stage!=="exam"&&stage!=="review")return;
  const tick=()=>{
   const remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));
   setSeconds(remaining);
   if(remaining===0)submitLatest.current();
  };
  const ticker=setInterval(tick,300);
  return()=>clearInterval(ticker);
 },[stage,deadline]);
 function edit(value:string){
  setDrafts(prev=>({...prev,[question.id]:value}));
  setSampleResult(null);setNotice("");
 }
 function move(next:number){
  cleanup();setSampleBusy(false);setSampleResult(null);setNotice("");
  setIndex(next);setStage("exam");
 }
 function onEditorKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){
   event.preventDefault();sample();return;
  }
  if(event.key!=="Tab"||event.altKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();
  const input=event.currentTarget;
  const result=indentCodeSource(currentDraft,input.selectionStart,input.selectionEnd,event.shiftKey);
  if(result.source.length>5000)return;
  edit(result.source);
  requestAnimationFrame(()=>{
   if(input.isConnected){input.focus();input.setSelectionRange(result.start,result.end);}
  });
 }
 function restart(){cleanup();submitting.current=false;setStage("intro");setConsent(false);setNotice("");setMarks([]);
  try{sessionStorage.removeItem(STORAGE_KEY)}catch{}
 }
 if(!hydrated)return <div className={styles.root}><header className={styles.header}><h1>软件工程岗位 · 综合编程模拟笔试</h1></header><p className={styles.note}>正在读取本标签页考场记录…</p></div>;
 const report=stage==="report"?summarizeEngineeringMock(marks):null;
 return <div className={styles.root}>
  <header className={styles.header}>
   <span className={styles.eyebrow}>SOCTHINK / ENGINEERING CODE EXAM</span>
   <h1>软件工程岗位 · 综合编程模拟笔试</h1>
   <p>6道编程题，覆盖前端、后端与测试/SRE；真正运行代码并按24组原创用例计分。</p>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <h2>入场确认</h2>
   <div className={styles.stats}><div><strong>60分钟</strong><span>固定考试时间</span></div><div><strong>6题</strong><span>编程实操</span></div><div><strong>100分</strong><span>分项原始成绩</span></div></div>
   <p>考试与日常训练分开：可跳题、标记复查、运行公开样例；正式交卷后才按所有测试用例评分。每题4组输入，按通过比例给分，交卷后显示题目与三个岗位领域的分数。</p>
   <p className={styles.note}>本考场是本站原创模拟笔试，不是牛客/HackerRank等平台授权试卷，也不是企业实际招聘考试。测试数据随客户端提供，无监考、防作弊或跨设备认证能力。代码只在本浏览器内隔离执行，不会上传服务器。</p>
   <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我理解这是本地模拟笔试，不能用成绩证明正式职业资质；请勿输入真实生产密码或商业机密代码。</label>
   <button type="button" className={workspace.primary} disabled={!consent} onClick={begin}>确认入场 · 开始60分钟模拟</button>
  </section>}
  {(stage==="exam"||stage==="review")&&<section className={styles.panel}>
   <div className={styles.examTop}>
    <div><strong>正在考试</strong><span>已填写 {answeredCount}/{ENGINEERING_MOCK_ITEMS.length} · 已标记 {Object.values(flagged).filter(Boolean).length}</span></div>
    <div className={seconds<=300?styles.timerUrgent:styles.timer} role="timer" aria-label="考试剩余时间">{secondsText(seconds)}</div>
   </div>
   <div className={styles.questionMap} aria-label="题目导航">
    {ENGINEERING_MOCK_QUESTIONS.map((q,i)=><button type="button" key={q.id}
     className={[styles.mapItem,index===i&&stage==="exam"?styles.mapActive:"",answered(q)?styles.mapAnswered:""].filter(Boolean).join(" ")}
     onClick={()=>move(i)} aria-current={index===i&&stage==="exam"?"step":undefined}>
      {i+1}{flagged[q.id]?" ★":""}
     </button>)}
    <button type="button" className={styles.reviewButton} onClick={()=>setStage("review")}>交卷复核</button>
   </div>
   {stage==="exam"&&<div className={expanded?styles.examExpanded:styles.examColumns}>
    <div className={styles.codeColumn}>
     <div className={styles.questionHeader}><div><span>{question.area} · 第{index+1}题 · {question.points}分</span><h2>{question.task.title}</h2></div>
      <button type="button" className={styles.flagButton} onClick={()=>setFlagged(prev=>({...prev,[question.id]:!prev[question.id]}))}>
       {flagged[question.id]?"★ 已标记":"☆ 标记复查"}
      </button>
     </div>
     <p className={styles.requirement}>{question.task.description}</p>
     <div className={styles.signature}>{question.task.signature}</div>
     <div className={workspace.editorFrame}>
      <div className={workspace.editorBar}><div className={workspace.fileName}><span>answer.js</span><span className={workspace.languageTag}>JavaScript</span></div>
       <button className={workspace.expandButton} type="button" aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>
        {expanded?"退出扩大模式":"扩大编辑区"}
       </button>
      </div>
      <label className={workspace.visuallyHidden} htmlFor="engineering-exam-editor">你的JavaScript代码</label>
      <textarea id="engineering-exam-editor" className={workspace.editor} maxLength={5000}
       rows={19} spellCheck={false} aria-label="你的JavaScript代码"
       value={currentDraft} onChange={e=>edit(e.target.value)} onKeyDown={onEditorKeyDown}/>
      <div className={workspace.editorStatus}><span>公开样例自测：Ctrl/⌘+Enter</span><span>{currentDraft.length}/5000字符 · 本标签页暂存</span></div>
     </div>
     <div className={styles.controls}>
      <button type="button" className={workspace.secondary} disabled={sampleBusy} onClick={sample}>
       {sampleBusy?"运行中…":"运行公开样例"}
      </button>
      <span className={styles.hintSmall}>正式成绩只在交卷后计算</span>
     </div>
     {sampleResult&&<div className={sampleResult.correct?styles.sampleGood:styles.sampleFail} role="status">
      <strong>{sampleResult.correct?"公开样例通过":"公开样例尚未通过"}</strong>
      <p>{sampleResult.message}</p>
     </div>}
     {notice&&<p className={styles.error} role="alert">{notice}</p>}
     <div className={styles.controls}>
      <button type="button" className={workspace.secondary} disabled={index===0} onClick={()=>move(index-1)}>上一题</button>
      {index<ENGINEERING_MOCK_ITEMS.length-1?
       <button type="button" className={workspace.primary} onClick={()=>move(index+1)}>下一题</button>:
       <button type="button" className={workspace.primary} onClick={()=>setStage("review")}>复查并交卷</button>}
     </div>
    </div>
    {!expanded&&<aside className={styles.example}>
     <h3>公开样例</h3><strong>输入</strong><pre>{JSON.stringify(question.task.cases[0].input,null,2)}</pre>
     <strong>预期结果</strong><pre>{JSON.stringify(question.task.cases[0].expected,null,2)}</pre>
     <p>考试期间可使用公开样例自测，不显示其余用例的评分结果；本地模拟不具保密试题能力。</p>
    </aside>}
   </div>}
   {stage==="review"&&<div className={styles.review}>
    <h2>交卷前检查</h2>
    <p>已填写{answeredCount}题，未填写{ENGINEERING_MOCK_ITEMS.length-answeredCount}题。未作答得0分；每题按4组实际用例通过比例折算分数。</p>
    <div className={styles.reviewGrid}>{ENGINEERING_MOCK_QUESTIONS.map((q,i)=><button type="button" key={q.id} onClick={()=>move(i)}>
     <strong>第{i+1}题 · {q.area}</strong><span>{answered(q)?"已填写":"未填写"}{flagged[q.id]?" · 已标记":""}</span>
    </button>)}</div>
    {notice&&<p role="alert" className={styles.error}>{notice}</p>}
    <div className={styles.controls}>
     <button className={workspace.secondary} type="button" onClick={()=>setStage("exam")} disabled={seconds===0}>返回考场</button>
     <button className={workspace.primary} type="button" onClick={submit}>确认交卷 · 自动评分</button>
    </div>
   </div>}
  </section>}
  {stage==="grading"&&<section className={styles.panel}>
   <h2>已交卷 · 正在判分</h2><p>隔离执行器正在对6道代码题逐题执行4组用例；本次提交的答案已锁定。</p>
   <div role="status" className={styles.grading}>已完成 {progress}/6 题评分</div>
  </section>}
  {report&&<section className={styles.panel}>
   <h2>本次模拟笔试成绩</h2>
   <div className={styles.score}><strong>{Number(report.total.toFixed(1))}<small> / 100分</small></strong><span>本次原创模拟原始成绩，不代表岗位录取概率、职业资格或人群常模</span></div>
   <div className={styles.dimensionGrid}>{report.dimensions.map(d=><div key={d.area}><strong>{d.area}</strong><span>{Number(d.points.toFixed(1))} / {d.maxPoints}分</span></div>)}</div>
   <h3>逐题评分明细</h3>
   <div className={styles.resultList}>{report.questions.map((r,i)=><div key={r.id}>
    <strong>第{i+1}题 · {r.title}</strong>
    <span>{r.passed}/4组通过 · {Number(r.points.toFixed(1))}/{r.maxPoints}分</span>
   </div>)}</div>
   <p className={styles.note}>仅当前标签页保存本地答卷与成绩。正式招聘笔试须另建身份校验、服务端保密测试、审计与防作弊，不可把本模拟成绩当作企业认证。</p>
   <div className={styles.controls}><button type="button" className={workspace.secondary} onClick={restart}>重新开始另一场模拟</button>
    <button type="button" className={workspace.primary} onClick={()=>window.print()}>打印本次结果</button></div>
  </section>}
 </div>;
}
