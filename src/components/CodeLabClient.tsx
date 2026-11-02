"use client";
import {useEffect,useRef,useState} from "react";
import {CODE_CHALLENGES,CODE_LAB_VERSION} from "@/lib/code-lab";
import type {CodeCheck} from "@/lib/code-lab-engine";
import styles from "./code-lab.module.css";
type Stage="intro"|"practice"|"report";
type WorkerReply={requestId:string;ok:boolean;result?:CodeCheck;error?:string};
const first=CODE_CHALLENGES[0];
export default function CodeLabClient(){
 const[stage,setStage]=useState<Stage>("intro");
 const[consent,setConsent]=useState(false);
 const[index,setIndex]=useState(0);
 const[source,setSource]=useState(first.starter);
 const[busy,setBusy]=useState(false);
 const[feedback,setFeedback]=useState<CodeCheck|null>(null);
 const[error,setError]=useState("");
 const[hint,setHint]=useState(false);
 const[solved,setSolved]=useState<Record<string,boolean>>({});
 const[attempts,setAttempts]=useState<Record<string,number>>({});
 const worker=useRef<Worker|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const task=CODE_CHALLENGES[index];
 const count=CODE_CHALLENGES.filter(x=>solved[x.id]).length;
 useEffect(()=>()=>{worker.current?.terminate();if(timer.current)clearTimeout(timer.current);},[]);
 function cleanup(){
  if(worker.current)worker.current.terminate();worker.current=null;
  if(timer.current)clearTimeout(timer.current);timer.current=null;
 }
 function navigate(i:number){
  cleanup();setIndex(i);setSource(CODE_CHALLENGES[i].starter);
  setBusy(false);setFeedback(null);setError("");setHint(false);
 }
 function reset(){
  navigate(0);setStage("intro");setConsent(false);setSolved({});setAttempts({});
 }
 function onSourceChange(value:string){
  setSource(value);setFeedback(null);setError("");
  setSolved(prev=>({...prev,[task.id]:false}));
 }
 function run(){
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
   w.postMessage({requestId,taskId:task.id,source});
  }catch{cleanup();setBusy(false);setError("无法创建安全执行环境，请更换现代浏览器重试。");}
 }
 return <div className={styles.root}>
  <header className={styles.header}>
   <span className={styles.eyebrow}>SOCTHINK · SOFTWARE ENGINEERING LAB</span>
   <h1>软件工程师 · 真实代码实操</h1>
   <p>六项原创岗位工作样例。自己编写JavaScript，在隔离的QuickJS环境里运行并核验结果。</p>
   <div className={styles.meta}><span>6项工程任务</span><span>真实执行 · 4组用例/题</span><span>浏览器内隔离</span><span>免费</span></div>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <h2>进入实操</h2>
   <p className={styles.lead}>这不是选择题。六项任务分别涵盖订单、资金统计、故障重试、测试稳定性、日志诊断与库存事件。你要编写符合约定接口的函数，系统会真实执行代码，检测正确性和边界情况。</p>
   <div className={styles.taskGrid}>{CODE_CHALLENGES.map(c=><div key={c.id}><strong>{c.title}</strong><span>{c.domain}</span></div>)}</div>
   <p className={styles.note}>运行方式：代码在WebAssembly QuickJS虚拟机里执行，浏览器Worker设运行超时，VM限制内存与栈，并不开放DOM、网络或本站账号接口。不会上传你输入的代码，也不会生成账号级考试成绩。浏览器刷新后训练记录消失。</p>
   <p className={styles.note}>成绩是本组原创题的完成情况，非企业招聘真题、职业证书或标准化人才选拔测验。项目源码中包含参考用例，不能用来监考或防作弊。</p>
   <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我理解这是免费编程实训，代码仅在隔离环境中执行。</label>
   <button type="button" className={styles.primary} disabled={!consent} onClick={()=>setStage("practice")}>开始编程实操</button>
  </section>}
  {stage==="practice"&&<div className={styles.workspace}>
   <section className={styles.panel}>
    <div className={styles.progressTop}><strong>任务 {index+1} / {CODE_CHALLENGES.length}</strong><span>已通过 {count}/{CODE_CHALLENGES.length}</span></div>
    <div className={styles.progress}><span style={{width:(100*count/CODE_CHALLENGES.length)+"%"}}/></div>
    <div className={styles.taskTop}><h2>{task.title}</h2><span>{task.domain}</span></div>
    <p className={styles.lead}>{task.description}</p>
    <div className={styles.signature}><strong>实现函数</strong><code>{task.signature}</code></div>
    <label className={styles.editorLabel} htmlFor="code-lab-input">你的JavaScript代码</label>
    <textarea id="code-lab-input" className={styles.editor} spellCheck={false}
      value={source} maxLength={5000} rows={11} onChange={e=>onSourceChange(e.target.value)}
      aria-label="你的JavaScript代码"/>
    <div className={styles.toolbar}>
     <button className={styles.secondary} type="button" disabled={busy} onClick={()=>setHint(h=>!h)}>{hint?"收起提示":"显示提示"}</button>
     <button className={styles.primary} type="button" disabled={busy||!source.trim()} onClick={run}>{busy?"隔离执行中…":"运行代码并核验"}</button>
    </div>
    {hint&&<p className={styles.hint}>{task.hint}</p>}
    <div role="status" aria-live="polite">
     {error&&<div className={styles.failure}><strong>本次执行失败</strong><p>{error}</p></div>}
     {feedback&&<div className={feedback.correct?styles.success:styles.failure}>
      <strong>{feedback.correct?"任务通过 · 4组真实执行全部正确":"需要修正代码"}</strong>
      <p>{feedback.message} · {feedback.passed}/{feedback.total}组已通过 · 本次运行约{feedback.elapsedMs}ms</p>
     </div>}
    </div>
    {feedback?.sample&&<div className={styles.output}>
     <strong>第1组输入与实际返回结果</strong>
     <pre>{JSON.stringify(feedback.sample,null,2)}</pre>
    </div>}
    <div className={styles.toolbar}>
     <button type="button" className={styles.secondary} disabled={busy||index===0} onClick={()=>navigate(index-1)}>上一任务</button>
     {index<CODE_CHALLENGES.length-1?
      <button type="button" className={styles.primary} disabled={busy||!solved[task.id]} onClick={()=>navigate(index+1)}>进入下一任务</button>:
      <button type="button" className={styles.primary} disabled={busy||count!==CODE_CHALLENGES.length} onClick={()=>setStage("report")}>查看技能练习报告</button>}
    </div>
   </section>
   <aside className={styles.panel}>
    <h2>题目与测试规则</h2>
    <div className={styles.info}><strong>第一组公开样例</strong><pre>{JSON.stringify(task.cases[0].input,null,2)}</pre>
     <strong>期望输出</strong><pre>{JSON.stringify(task.cases[0].expected,null,2)}</pre></div>
    <div className={styles.info}><strong>验证方式</strong><p>每次运行4组用例（公开样例、空输入或其他边界输入），逐组比较真实返回值。不仅检查代码文本。</p></div>
    <div className={styles.info}><strong>执行约束</strong><p>JavaScript纯函数；单次源码≤5000字符；每用例限时约850ms；VM内存16MiB；独立Worker总超时12秒。无网络、文件、系统调用。</p></div>
    <div className={styles.info}><strong>适用范围</strong><p>本站原创自学题，不具企业候选人监考、防作弊或行业资格证明能力。</p></div>
   </aside>
  </div>}
  {stage==="report"&&<section className={styles.panel}>
   <h2>软件工程实训记录</h2>
   <p className={styles.lead}>你在隔离JavaScript执行环境中完成了 <strong>{count}/{CODE_CHALLENGES.length}</strong> 项原创工程任务。各项结果基于实际代码运行与4组输入比对。</p>
   <div className={styles.reportGrid}>{CODE_CHALLENGES.map(c=><div key={c.id}><strong>{c.title}</strong><span>{solved[c.id]?"通过":"未通过"} · 运行 {attempts[c.id]??0} 次</span></div>)}</div>
   <p className={styles.note}>版本：{CODE_LAB_VERSION}。不含常模、就业概率、正式专业能力证书，也不保留跨设备成绩。仅表示本次模拟任务完成情况。</p>
   <div className={styles.toolbar}><button type="button" className={styles.secondary} onClick={reset}>重新练习</button><button type="button" className={styles.primary} onClick={()=>window.print()}>打印本次记录</button></div>
  </section>}
 </div>;
}
