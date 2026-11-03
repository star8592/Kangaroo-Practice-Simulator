"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import type {KeyboardEvent} from "react";
import {CODE_LAB_SESSION_KEY,indentCodeSource,parseCodeLabSnapshot} from "@/lib/code-lab-session";
import {CODE_CHALLENGES,CODE_LAB_VERSION} from "@/lib/code-lab";
import type {CodeChallenge} from "@/lib/code-lab";
import {ENGINEERING_TRACKS,ENGINEERING_TRACK_VERSION} from "@/lib/engineering-code-tracks";
import type {EngineeringTrackId} from "@/lib/engineering-code-tracks";
import type {CodeCheck} from "@/lib/code-lab-engine";
import styles from "./code-lab.module.css";
type Stage="intro"|"practice"|"report";
type WorkerReply={requestId:string;ok:boolean;result?:CodeCheck;error?:string};
const noNotifications=()=>()=>{};
const browserReady=()=>true;
const serverNotReady=()=>false;
function loadLocalAttempt(key:string,tasks:readonly CodeChallenge[],version:string){
 if(typeof window==="undefined")return null;
 try{return parseCodeLabSnapshot(sessionStorage.getItem(key),tasks,version);}
 catch{return null;}
}
export default function CodeLabClient({trackId}:{trackId?:EngineeringTrackId}={}){
 const track=trackId?ENGINEERING_TRACKS[trackId]:null;
 const tasks=track?.challenges??CODE_CHALLENGES;
 const version=track?CODE_LAB_VERSION+"-"+ENGINEERING_TRACK_VERSION+"-"+track.id:CODE_LAB_VERSION;
 const sessionKey=track?CODE_LAB_SESSION_KEY+"-"+track.id:CODE_LAB_SESSION_KEY;
 const hydrated=useSyncExternalStore(noNotifications,browserReady,serverNotReady);
 const [initial]=useState(()=>loadLocalAttempt(sessionKey,tasks,version));
 const[stage,setStage]=useState<Stage>(initial?.stage??"intro");
 const[consent,setConsent]=useState(false);
 const[index,setIndex]=useState(initial?.index??0);
 const[drafts,setDrafts]=useState<Record<string,string>>(initial?.drafts??{});
 const[source,setSource]=useState(()=>initial?.drafts[tasks[initial.index].id]??tasks[initial?.index??0].starter);
 const[busy,setBusy]=useState(false);
 const[feedback,setFeedback]=useState<CodeCheck|null>(null);
 const[error,setError]=useState("");
 const[hint,setHint]=useState(false);
 const[expanded,setExpanded]=useState(false);
 const[confirmReset,setConfirmReset]=useState(false);
 const[solved,setSolved]=useState<Record<string,boolean>>(initial?.solved??{});
 const[attempts,setAttempts]=useState<Record<string,number>>(initial?.attempts??{});
 const worker=useRef<Worker|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const task=tasks[index];
 const count=tasks.filter(x=>solved[x.id]).length;
 useEffect(()=>()=>{worker.current?.terminate();if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{
  if(!hydrated)return;
  try{
   if(stage==="intro")sessionStorage.removeItem(sessionKey);
   else sessionStorage.setItem(sessionKey,JSON.stringify({
    version,stage,index,drafts,solved,attempts
   }));
  }catch{/* Private browsing or storage disabled: practice remains usable in current view. */}
 },[hydrated,stage,index,drafts,solved,attempts,version,sessionKey]);
 function cleanup(){
  if(worker.current)worker.current.terminate();worker.current=null;
  if(timer.current)clearTimeout(timer.current);timer.current=null;
 }
 function navigate(i:number){
  cleanup();setIndex(i);setSource(drafts[tasks[i].id]??tasks[i].starter);
  setBusy(false);setFeedback(null);setError("");setHint(false);
 }
 function reset(){
  cleanup();setIndex(0);setSource(tasks[0].starter);
  setBusy(false);setFeedback(null);setError("");setHint(false);
  setStage("intro");setConsent(false);setSolved({});setAttempts({});setDrafts({});setExpanded(false);setConfirmReset(false);
  try{sessionStorage.removeItem(sessionKey)}catch{}
 }
 function onSourceChange(value:string){
  setSource(value);setDrafts(prev=>({...prev,[task.id]:value}));setFeedback(null);setError("");
  setSolved(prev=>({...prev,[task.id]:false}));
 }
 function run(code=source){
  if(busy)return;
  setBusy(true);setFeedback(null);setError("");
  setAttempts(prev=>({...prev,[task.id]:(prev[task.id]??0)+1}));
  cleanup();
  try{
   const w=new Worker(new URL("../workers/code-lab.worker.ts",import.meta.url),{type:"module"});
   worker.current=w;
   const requestId=task.id+"-"+Date.now();
   w.onmessage=(event:MessageEvent<WorkerReply>)=>{
    if(event.data.requestId!==requestId)return;
    cleanup();setBusy(false);
    if(!event.data.ok||!event.data.result){setError(event.data.error??"代码执行失败");return;}
    setFeedback(event.data.result);
    if(event.data.result.correct)setSolved(prev=>({...prev,[task.id]:true}));
   };
   w.onerror=()=>{cleanup();setBusy(false);setError("隔离执行环境无法启动，请刷新重试。");};
   timer.current=setTimeout(()=>{
    cleanup();setBusy(false);setError("执行超过安全时间限制，已终止本次运行。请检查死循环或复杂度。");
   },12000);
   w.postMessage({requestId,taskId:task.id,source:code});
  }catch{cleanup();setBusy(false);setError("无法创建安全执行环境，请更换现代浏览器重试。");}
 }
 function onEditorKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
  if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){
   event.preventDefault();
   if(!busy&&event.currentTarget.value.trim())run(event.currentTarget.value);
   return;
  }
  if(event.key!=="Tab"||event.ctrlKey||event.metaKey||event.altKey||busy)return;
  event.preventDefault();
  const input=event.currentTarget;
  // The DOM holds the latest keystroke even before React commits the controlled state.
  const next=indentCodeSource(input.value,input.selectionStart,input.selectionEnd,event.shiftKey);
  if(next.source.length>5000)return;
  onSourceChange(next.source);
  requestAnimationFrame(()=>{
   if(input.isConnected){input.focus();input.setSelectionRange(next.start,next.end);}
  });
 }
 if(!hydrated)return <div className={styles.root}><p className={styles.note}>正在读取本标签页的练习进度…</p></div>;
 return <div className={styles.root}>
  <header className={[styles.header,stage==="practice"?styles.headerPractice:""].filter(Boolean).join(" ")}>
   <span className={styles.eyebrow}>SOCTHINK · {track?"ENGINEERING TRACK":"SOFTWARE ENGINEERING LAB"}</span>
   <h1>{track?.name??"软件工程师 · 真实代码实操"}</h1>
   <p>{track?.summary??"六项原创岗位工作样例。自己编写JavaScript，在隔离的QuickJS环境里运行并核验结果。"}</p>
   <div className={styles.meta}><span>{tasks.length}项工程任务</span><span>真实执行 · 4组用例/题</span><span>浏览器内隔离</span><span>免费</span></div>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <h2>进入实操</h2>
   <p className={styles.lead}>{track?track.summary:"这不是选择题。六项任务分别涵盖订单、资金统计、故障重试、测试稳定性、日志诊断与库存事件。你要编写符合约定接口的函数，系统会真实执行代码，检测正确性和边界情况。"}</p>
   <div className={styles.taskGrid}>{tasks.map(c=><div key={c.id}><strong>{c.title}</strong><span>{c.domain}</span></div>)}</div>
   <p className={styles.note}>运行方式：代码在WebAssembly QuickJS虚拟机里执行，浏览器Worker设运行超时，VM限制内存与栈，并不开放DOM、网络或本站账号接口。不会上传你输入的代码，也不会生成账号级考试成绩。本标签页允许会话存储时，源码草稿与已完成任务可在刷新后恢复；不跨设备同步。不要粘贴真实账号密钥或机密代码。</p>
   <p className={styles.note}>成绩是本组原创题的完成情况，非企业招聘真题、职业证书或标准化人才选拔测验。项目源码中包含参考用例，不能用来监考或防作弊。</p>
   <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我理解这是免费编程实训，代码仅在隔离环境中执行。</label>
   <button type="button" className={styles.primary} disabled={!consent} onClick={()=>setStage("practice")}>开始编程实操</button>
  </section>}
  {stage==="practice"&&<div className={[styles.workspace,expanded?styles.workspaceExpanded:""].filter(Boolean).join(" ")}>
   <section className={[styles.panel,styles.editorPanel].join(" ")}>
    <div className={styles.progressTop}><strong>任务 {index+1} / {tasks.length}</strong>
     <div className={styles.progressActions}><span>已通过 {count}/{tasks.length}</span>
      <button type="button" className={styles.resetLink} onClick={()=>setConfirmReset(true)}>重置练习</button>
     </div>
    </div>
    {confirmReset&&<div className={styles.resetConfirm} role="group" aria-label="确认清空本次练习">
      <span>清空本标签页的所有代码草稿和已完成记录？</span>
      <button type="button" className={styles.secondary} onClick={()=>setConfirmReset(false)}>取消</button>
      <button type="button" className={styles.secondary} onClick={reset}>确认清空</button>
     </div>}
    <div className={styles.progress}><span style={{width:(100*count/tasks.length)+"%"}}/></div>
    <div className={styles.taskTop}><h2>{task.title}</h2><span>{task.domain}</span></div>
    <p className={styles.lead}>{task.description}</p>
    <div className={styles.signature}><strong>实现函数</strong><code>{task.signature}</code></div>
    <div className={styles.editorFrame}>
     <div className={styles.editorBar}>
      <div className={styles.fileName}><span className={styles.fileDot} aria-hidden="true"/><span>solution.js</span><span className={styles.languageTag}>JavaScript</span></div>
      <button type="button" className={styles.expandButton} aria-pressed={expanded}
       onClick={()=>setExpanded(v=>!v)}>{expanded?"退出扩大模式":"扩大编辑区"}</button>
     </div>
     <label className={styles.visuallyHidden} htmlFor="code-lab-input">你的JavaScript代码</label>
     <textarea id="code-lab-input" className={styles.editor} spellCheck={false}
       value={source} maxLength={5000} rows={20} onChange={e=>onSourceChange(e.target.value)} onKeyDown={onEditorKeyDown}
       aria-label="你的JavaScript代码"/>
     <div className={styles.editorStatus}><span>QuickJS · 隔离运行</span><span className={styles.editorShortcut}>Tab缩进 · Shift+Tab反缩进 · Ctrl/⌘+Enter运行</span><span>{source.length} / 5000 字符 · 本标签页暂存</span></div>
    </div>
    <div className={styles.toolbar}>
     <button className={styles.secondary} type="button" disabled={busy} onClick={()=>setHint(h=>!h)}>{hint?"收起提示":"显示提示"}</button>
     <button className={styles.primary} type="button" disabled={busy||!source.trim()} onClick={()=>run()}>{busy?"隔离执行中…":"运行代码并核验"}</button>
    </div>
    {hint&&<p className={styles.hint}>{task.hint}</p>}
    {(busy||error||feedback)&&<div className={styles.console}>
     <div className={styles.consoleBar}><strong>执行结果</strong><span>{busy?"运行中":error?"执行失败":feedback?.correct?"通过":"未通过"}</span></div>
     <div className={styles.consoleBody} role="status" aria-live="polite">
      {busy&&<p>正在隔离执行并核对输出…</p>}
      {error&&<div className={styles.consoleError}><strong>本次执行失败</strong><p>{error}</p></div>}
      {feedback&&<div className={feedback.correct?styles.consoleSuccess:styles.consoleError}>
       <strong>{feedback.correct?"任务通过 · 4组真实执行全部正确":"需要修正代码"}</strong>
       <p>{feedback.message} · {feedback.passed}/{feedback.total}组已通过 · 本次运行约{feedback.elapsedMs}ms</p>
      </div>}
      {feedback?.sample&&<div className={styles.consoleSample}>
       <strong>样例输入 / 期望输出 / 实际返回</strong>
       <pre>{JSON.stringify(feedback.sample,null,2)}</pre>
      </div>}
     </div>
    </div>}
    <div className={styles.toolbar}>
     <button type="button" className={styles.secondary} disabled={busy||index===0} onClick={()=>navigate(index-1)}>上一任务</button>
     {index<tasks.length-1?
      <button type="button" className={styles.primary} disabled={busy||!solved[task.id]} onClick={()=>navigate(index+1)}>进入下一任务</button>:
      <button type="button" className={styles.primary} disabled={busy||count!==tasks.length} onClick={()=>setStage("report")}>查看技能练习报告</button>}
    </div>
   </section>
   <aside className={styles.panel}>
    <h2>输入与预期</h2>
    <div className={styles.info}><strong>第一组公开样例</strong><pre>{JSON.stringify(task.cases[0].input,null,2)}</pre>
     <strong>期望输出</strong><pre>{JSON.stringify(task.cases[0].expected,null,2)}</pre></div>
    <details className={styles.ruleDetails}>
     <summary>评分和运行规则</summary>
     <p>每次运行4组测试输入，真实执行并核对输出，而不是只检测代码文本。</p>
     <p>JavaScript纯函数；源码最多5000字符；每用例约850ms；虚拟机内存16MiB，Worker总超时12秒。不可访问网络、文件和系统调用。</p>
     <p>本站原创训练，非官方职业资格认证。</p>
    </details>
   </aside>
  </div>}
  {stage==="report"&&<section className={styles.panel}>
   <h2>{track?track.focus+"专项训练记录":"软件工程实训记录"}</h2>
   <p className={styles.lead}>你在隔离JavaScript执行环境中完成了 <strong>{count}/{tasks.length}</strong> 项原创工程任务。各项结果基于实际代码运行与4组输入比对。</p>
   <div className={styles.reportGrid}>{tasks.map(c=><div key={c.id}><strong>{c.title}</strong><span>{solved[c.id]?"通过":"未通过"} · 运行 {attempts[c.id]??0} 次</span></div>)}</div>
   <p className={styles.note}>版本：{version}。不含常模、就业概率、正式专业能力证书，本标签页可恢复本次练习记录，但不跨设备同步。仅表示本次模拟任务完成情况。</p>
   <div className={styles.toolbar}><button type="button" className={styles.secondary} onClick={reset}>重新练习</button><button type="button" className={styles.primary} onClick={()=>window.print()}>打印本次记录</button></div>
  </section>}
 </div>;
}
