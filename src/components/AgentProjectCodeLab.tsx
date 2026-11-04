"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import type {CodeCheck} from "@/lib/code-lab-engine";
import {AGENT_PROJECT_CODE_CHALLENGES as TASKS} from "@/lib/agent-project-code";
import s from "./AgentProjectCourse.module.css";

type WorkerReply={requestId:string;ok:boolean;result?:CodeCheck;error?:string};
type AttemptSummary={
 attemptId:string;taskId:string;passed:number;total:number;correct:boolean;submittedAt:number;
};
const KEY="socthink:agent-code-drafts:v1";
const API="/api/skill-labs/agent-project/attempts";

export default function AgentProjectCodeLab(){
 const [index,setIndex]=useState(0);
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [source,setSource]=useState(TASKS[0].starter);
 const [feedback,setFeedback]=useState<CodeCheck|null>(null);
 const [results,setResults]=useState<Record<string,CodeCheck>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState(false);
 const [saveMessage,setSaveMessage]=useState("");
 const [saved,setSaved]=useState<AttemptSummary[]>([]);
 const [account,setAccount]=useState<"checking"|"yes"|"no"|"unavailable">("checking");
 const [attemptId,setAttemptId]=useState("");
 const worker=useRef<Worker|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const task=TASKS[index];
 const localPassed=TASKS.filter(t=>results[t.id]?.correct).length;
 const serverPassed=TASKS.filter(t=>saved.some(a=>a.taskId===t.id&&a.correct)).length;

 function cleanup(){
  worker.current?.terminate();worker.current=null;
  if(timer.current)clearTimeout(timer.current);timer.current=null;
 }
 async function refreshHistory(){
  try{
   const response=await fetch(API,{cache:"no-store",credentials:"same-origin"});
   if(response.status===401){setAccount("no");return;}
   if(!response.ok){setAccount("unavailable");return;}
   const body=await response.json() as {attempts?:AttemptSummary[]};
   if(!Array.isArray(body.attempts))throw Error("INVALID_HISTORY");
   setSaved(body.attempts);setAccount("yes");
  }catch{setAccount("unavailable");}
 }
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try{
    const savedDrafts=JSON.parse(sessionStorage.getItem(KEY)??"{}");
    if(savedDrafts&&typeof savedDrafts==="object"&&!Array.isArray(savedDrafts)){
     const valid:Record<string,string>={};
     for(const task of TASKS)if(typeof savedDrafts[task.id]==="string"&&savedDrafts[task.id].length<=5000)
      valid[task.id]=savedDrafts[task.id];
     setDrafts(valid);
     setSource(valid[TASKS[0].id]??TASKS[0].starter);
    }
   }catch{/* Session storage is optional. */}
  });
  void refreshHistory();
  return ()=>{cancelAnimationFrame(frame);cleanup();};
 },[]);

 function changeSource(next:string){
  if(next.length>5000)return;
  setSource(next);setFeedback(null);setSaveMessage("");setError("");
  setResults(prev=>{const updated={...prev};delete updated[task.id];return updated;});
  const update={...drafts,[task.id]:next};setDrafts(update);
  try{sessionStorage.setItem(KEY,JSON.stringify(update));}catch{/* Privacy mode */}
 }
 function go(next:number){
  if(busy||saving)return;
  cleanup();setIndex(next);setSource(drafts[TASKS[next].id]??TASKS[next].starter);
  setFeedback(null);setSaveMessage("");setError("");setAttemptId("");
 }
 function run(){
  if(busy||saving||!source.trim())return;
  cleanup();setBusy(true);setError("");setFeedback(null);setSaveMessage("");
  const id=crypto.randomUUID();setAttemptId(id);
  const requestId=id;
  try{
   const w=new Worker(new URL("../workers/code-lab.worker.ts",import.meta.url),{type:"module"});
   worker.current=w;
   w.onmessage=(event:MessageEvent<WorkerReply>)=>{
    if(event.data.requestId!==requestId)return;
    cleanup();setBusy(false);
    if(!event.data.ok||!event.data.result){setError(event.data.error??"执行失败");return;}
    setFeedback(event.data.result);
    setResults(prev=>({...prev,[task.id]:event.data.result!}));
   };
   w.onerror=()=>{cleanup();setBusy(false);setError("隔离执行器无法启动，请刷新重试。");};
   timer.current=setTimeout(()=>{
    cleanup();setBusy(false);setError("运行超过12秒，已中止本次代码执行。");
   },12000);
   w.postMessage({requestId,taskId:task.id,source});
  }catch{cleanup();setBusy(false);setError("当前浏览器无法启动隔离代码执行器。");}
 }
 async function saveToAccount(){
  if(!feedback||saving||account!=="yes"||!attemptId)return;
  setSaving(true);setSaveMessage("");
  try{
   const response=await fetch(API,{
    method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({attemptId,taskId:task.id,source}),
   });
   const body=await response.json() as {
    code?:string;message?:string;summary?:AttemptSummary;feedback?:string;
   };
   if(!response.ok){
    if(response.status===401){setAccount("no");throw Error("登录已失效，请重新微信登录。");}
    throw Error(body.message??(response.status===429?"提交过于频繁，请稍后再试。":"服务器复测失败："+(body.code??response.status)));
   }
   if(!body.summary)throw Error("服务器未确认作业存档，请稍后重试。");
   setSaveMessage("服务器已重新运行 "+body.summary.passed+"/"+body.summary.total+" 组测试，并保存到微信学习记录。");
   await refreshHistory();
  }catch(e){setSaveMessage(e instanceof Error?e.message:"网络错误，未确认保存。");}
  finally{setSaving(false);}
 }
 return <section id="agent-code-lab" className={s.shell} aria-labelledby="agent-code-title">
  <div className={s.header}>
   <div>
    <span className={s.eyebrow}>CODE LAB · 可运行的工程作业</span>
    <h2 id="agent-code-title">亲手编写工单 Agent 的核心规则</h2>
    <p>六项 JavaScript 函数任务，与上面的 Python 工程原理一一对应。自己写代码，系统实际执行测试，给出失败反馈。无需购买。</p>
   </div>
   <div className={s.progress} aria-label="本次浏览器会话中真正通过的代码任务">
    <strong>{localPassed}/{TASKS.length}</strong>
    <span>本次代码任务通过</span>
    <div className={s.progressBar} aria-hidden="true"><i style={{width:(100*localPassed/TASKS.length)+"%"}}/></div>
   </div>
  </div>
  <div className={s.content}>
   <nav className={s.menu} aria-label="代码实训任务">
    {TASKS.map((t,i)=><button key={t.id} type="button"
     onClick={()=>go(i)} disabled={busy||saving}
     aria-current={i===index?"step":undefined}
     className={s.menuItem+(i===index?" "+s.menuActive:"")}>
      <span className={s.num}>{String(i+1).padStart(2,"0")}</span>
      <span className={s.menuText}><strong>{t.title.replace(/^\d+\s*·\s*/,"")}</strong><small>{t.domain} · {t.cases.length}组测试</small></span>
      {results[t.id]?.correct&&<span className={s.done} aria-label="本次运行全部通过">✓</span>}
     </button>)}
   </nav>
   <article className={s.lesson} aria-labelledby="agent-code-task">
    <div className={s.lessonTop}><span>代码作业 {index+1}/{TASKS.length}</span><span>{task.domain}</span></div>
    <h3 id="agent-code-task">{task.title}</h3>
    <p>{task.description}</p>
    <div className={s.codeHead}>接口要求 <code>{task.signature}</code></div>
    <label htmlFor="agent-source-editor" className={s.codeHead}>你的 JavaScript 代码</label>
    <textarea id="agent-source-editor" aria-label="你的工单 Agent JavaScript 代码"
     className={s.editor} spellCheck={false} rows={12} maxLength={5000}
     value={source} onChange={e=>changeSource(e.target.value)} disabled={busy||saving}/>
    <div className={s.editorMeta}><span>QuickJS/WASM · Worker 隔离运行</span><span>{source.length}/5000 字符</span></div>
    <details className={s.assignment}><summary>查看提示与公开样例</summary>
     <p>{task.hint}</p>
     <pre className={s.code}>{JSON.stringify(task.cases[0],null,2)}</pre>
    </details>
    <div className={s.workButtons}>
     <button type="button" className={s.checkButton} disabled={busy||saving||!source.trim()} onClick={run}>
      {busy?"实际运行中…":"运行代码并检查"}
     </button>
     <button type="button" className={s.secondaryButton} disabled={busy||saving} onClick={()=>changeSource(task.starter)}>
      恢复初始代码
     </button>
    </div>
    {error&&<p role="alert" className={s.retry}>{error}</p>}
    {feedback&&<div className={s.exercise} aria-live="polite">
     <h4>{feedback.correct?"实际代码测试通过":"代码需要修改"}</h4>
     <p className={feedback.correct?s.success:s.retry}>{feedback.message} · {feedback.passed}/{feedback.total} 组通过</p>
     {feedback.sample&&<details><summary>查看一次输入、期望结果与实际结果</summary>
      <pre className={s.code}>{JSON.stringify(feedback.sample,null,2)}</pre>
     </details>}
     <p className={s.micro}>这是可执行函数测试，不是 Python 项目的完整验收，也不是职业资格证书。</p>
     {account==="yes"&&<button type="button" className={s.checkButton} disabled={saving} onClick={()=>void saveToAccount()}>
      {saving?"服务器独立复测中…":"保存本次作业到微信学习记录"}
     </button>}
     {account==="no"&&<p>本机测试免费。<Link href="/login?next=%2Fskill-labs%2Fagent-foundations">微信登录</Link>后，可主动提交服务器复测并保存跨设备记录。</p>}
     {account==="unavailable"&&<p className={s.micro}>服务器学习档案当前无法查询；浏览器内免费代码练习不受影响。</p>}
     {saveMessage&&<p role="status" className={s.notice}>{saveMessage}</p>}
    </div>}
    <div className={s.next}>
     <button type="button" disabled={index===0||busy||saving} onClick={()=>go(index-1)}>上一任务</button>
     <button type="button" disabled={index===TASKS.length-1||busy||saving} onClick={()=>go(index+1)}>下一任务 →</button>
    </div>
   </article>
  </div>
  <div className={s.accountSummary}>
   <strong>微信账号工程练习记录</strong>
   {account==="yes"
    ?<p>服务器独立复测已通过 {serverPassed}/{TASKS.length} 项 · 已保存最近 {saved.length} 次提交。{saved.length?"最近一次："+new Date(saved[0].submittedAt).toLocaleString("zh-CN"):"可在上面运行代码后主动保存。"}</p>
    :<p>{account==="checking"?"正在检查账号记录…":account==="no"?"未登录微信；不影响免费实操。":"账号记录暂不可用。"}</p>}
  </div>
  <p className={s.notice}>安全与范围：这六项是 JavaScript 的纯函数实训，复用本站现有隔离 QuickJS 运行器；原 Python 工单 Agent 仍需在本地运行其独立单元测试。浏览器测试用例对学员可见，不作防作弊认证。源码默认只在浏览器；点击“保存”才发送到服务器重新测试，服务器只存测试摘要和代码指纹，不保存源码或真实工单数据。</p>
 </section>;
}
