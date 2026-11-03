"use client";
import {useEffect,useRef,useState,useSyncExternalStore} from "react";
import Link from "next/link";
import {
 getInterviewProfile,selectFollowup,buildInterviewReview
} from "@/lib/career-interview-scenarios";
import type {InterviewExchange} from "@/lib/career-interview-scenarios";
import {
 EMPTY_INTERVIEW_JOB_CONTEXT,INTERVIEW_JOB_LIMITS,isInterviewJobContext,
 analyzeInterviewJobContext,buildJobFocusedFollowup
} from "@/lib/career-interview-context";
import type {InterviewJobContext} from "@/lib/career-interview-context";
import styles from "./career-interview.module.css";
type Stage="intro"|"main"|"followup"|"review"|"report";
type State={version:string;stage:Stage;index:number;entries:Record<string,InterviewExchange>;context?:InterviewJobContext};
const VERSION="career-interview-structured-preview-20261102-v1";
const subscribe=()=>()=>{};
const ready=()=>true;
const notReady=()=>false;
const empty=():InterviewExchange=>({id:"",answer:"",followup:"",followupAnswer:"",selfChecked:[]});
function storageKey(id:string){return "socthink:career-interview:"+VERSION+":"+id;}
function loadSaved(id:string,count:number):State|null{
 if(typeof window==="undefined")return null;
 try{
  const raw=sessionStorage.getItem(storageKey(id));
  if(!raw||raw.length>55000)return null;
  const val=JSON.parse(raw) as State;
  if(val.version!==VERSION||!["main","followup","review","report"].includes(val.stage)
   ||!Number.isInteger(val.index)||val.index<0||val.index>=count
   ||!val.entries||Array.isArray(val.entries)||typeof val.entries!=="object"
   ||(val.context!==undefined&&!isInterviewJobContext(val.context)))return null;
  const allowed=new Set(getInterviewProfile(id)?.questions.map(q=>q.id)??[]);
  const valid=Object.entries(val.entries).every(([q,e])=>
   allowed.has(q)&&e!==null&&typeof e==="object"&&
   typeof e.answer==="string"&&e.answer.length<=2500&&
   typeof e.followup==="string"&&e.followup.length<=500&&
   typeof e.followupAnswer==="string"&&e.followupAnswer.length<=2500&&
   Array.isArray(e.selfChecked)&&e.selfChecked.length<=3);
  if(!valid)return null;
  return val;
 }catch{return null;}
}
export default function CareerInterviewClient({profileId}:{profileId:string}){
 const profile=getInterviewProfile(profileId)!;
 const hydrated=useSyncExternalStore(subscribe,ready,notReady);
 const [saved]=useState(()=>loadSaved(profileId,profile.questions.length));
 const [stage,setStage]=useState<Stage>(saved?.stage??"intro");
 const [index,setIndex]=useState(saved?.index??0);
 const [entries,setEntries]=useState<Record<string,InterviewExchange>>(saved?.entries??{});
 const [context,setContext]=useState<InterviewJobContext>(saved?.context??EMPTY_INTERVIEW_JOB_CONTEXT);
 const contextAnalysis=analyzeInterviewJobContext(profileId,context);
 const [consent,setConsent]=useState(false);
 const [semanticEnabled,setSemanticEnabled]=useState(false);
 const [semanticProvider,setSemanticProvider]=useState<"local"|"external"|null>(null);
 const [modelProviders,setModelProviders]=useState<string[]>([]);
 const [semanticConsent,setSemanticConsent]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const requestEpoch=useRef(0);
 useEffect(()=>{
  let active=true;
  fetch("/api/career/interviews/followup",{cache:"no-store"})
   .then(r=>r.ok?r.json():null)
   .then(d=>{if(active&&d?.enabled===true){setSemanticEnabled(true);setSemanticProvider(d.provider==="local"?"local":"external");
    setModelProviders(Array.isArray(d.providers)?d.providers.filter((p:unknown)=>typeof p==="string").slice(0,2):[]);}})
   .catch(()=>{});
  return ()=>{active=false;};
 },[]);
 const [confirmReset,setConfirmReset]=useState(false);
 const question=profile.questions[index];
 const entry=entries[question.id]??empty();
 useEffect(()=>{
  if(!hydrated)return;
  try{
   if(stage==="intro")sessionStorage.removeItem(storageKey(profileId));
   else sessionStorage.setItem(storageKey(profileId),JSON.stringify({
    version:VERSION,stage,index,entries,context,
   }));
  }catch{/* Storage can be restricted; current page stays usable. */}
 },[hydrated,profileId,stage,index,entries,context]);
 function updateCurrent(next:Partial<InterviewExchange>){
  setEntries(prev=>({...prev,[question.id]:{...empty(),...prev[question.id],id:question.id,...next}}));
 }
 function start(){setIndex(0);setEntries({});setConfirmReset(false);setStage("main");}
 async function confirmMain(){
  if(!entry.answer.trim()||submitting)return;
  const epoch=++requestEpoch.current;
  const followup=selectFollowup(question,entry.answer);
  let text=buildJobFocusedFollowup(profile.id,index,followup.text,entry.answer,context);
  let mode:"guided"|"semantic"|"rule"="rule",evidence="",reason="";
  setSubmitting(true);
  if(semanticEnabled&&semanticConsent){
   try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),14500);
    try{
     const response=await fetch("/api/career/interviews/followup",{
      method:"POST",cache:"no-store",signal:controller.signal,
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({profileId:profile.id,questionId:question.id,answer:entry.answer,context})
     });
     if(response.ok){
      const result=await response.json();
      if((result.mode==="semantic"||result.mode==="guided")&&typeof result.question==="string"&&result.question.length<=240){
       text=result.question;mode=result.mode;
       evidence=typeof result.evidenceQuote==="string"?result.evidenceQuote:"";
       reason=typeof result.reason==="string"?result.reason:"";
      }
     }
    }finally{clearTimeout(timer)}
   }catch{/* Network/model unavailable: preserve usable rule-based practice. */}
  }
  if(requestEpoch.current!==epoch)return;
  updateCurrent({followup:text,followupMode:mode,followupEvidence:evidence,followupReason:reason,followupAnswer:""});
  setSubmitting(false);
  setStage("followup");
 }
 function next(){
  if(!entry.followupAnswer.trim())return;
  if(index+1<profile.questions.length){setIndex(i=>i+1);setStage("main");}
  else setStage("review");
 }
 function reset(){
  requestEpoch.current++;setSubmitting(false);setSemanticConsent(false);
  setIndex(0);setEntries({});setContext(EMPTY_INTERVIEW_JOB_CONTEXT);setConsent(false);setConfirmReset(false);
  try{sessionStorage.removeItem(storageKey(profileId))}catch{}
  setStage("intro");
 }
 const report=buildInterviewReview(profile,entries);
 if(!hydrated)return <p className={styles.loading}>正在恢复本标签页面试练习…</p>;
 return <div className={styles.root}>
  <header className={styles.head}>
   <span className={styles.kicker}>SOCTHINK · CAREER INTERVIEW PRACTICE</span>
   <h1>{profile.title}</h1>
   <p>{profile.subtitle}</p>
  </header>
  {stage==="intro"&&<section className={styles.panel}>
   <span className={styles.status}>免费体验 · 结构化模拟（非AI语义评分）</span>
   <h2>面试入场</h2>
   <p className={styles.lead}>{profile.description}</p>
   <div className={styles.facts}>
    <div><strong>5轮</strong><span>岗位情境主问题</span></div>
    <div><strong>5次</strong><span>按回答特征选定追问</span></div>
    <div><strong>1份</strong><span>真实回答复盘与补弱清单</span></div>
   </div>
   <p>适用对象：{profile.audience}</p>
   <div className={styles.contextPanel}>
    <h3>按目标岗位准备（选填）</h3>
    <p className={styles.small}>粘贴招聘要求和与岗位相关的经历摘要。本场会用岗位关键词调整追问；目前只是规则匹配，不是AI理解或能力评分。</p>
    <div className={styles.contextFields}>
     <label>目标岗位名称
      <input type="text" maxLength={INTERVIEW_JOB_LIMITS.targetRole}
       value={context.targetRole}
       onChange={e=>setContext(prev=>({...prev,targetRole:e.target.value}))}
       placeholder={profile.role}/>
     </label>
     <label>招聘要求 / JD
      <textarea rows={4} maxLength={INTERVIEW_JOB_LIMITS.jobDescription}
       value={context.jobDescription}
       onChange={e=>setContext(prev=>({...prev,jobDescription:e.target.value}))}
       placeholder="粘贴招聘信息中的岗位职责、技能要求或业务场景，不必粘贴公司联系方式。"/>
     </label>
     <label>你的相关经历摘要
      <textarea rows={3} maxLength={INTERVIEW_JOB_LIMITS.experienceSummary}
       value={context.experienceSummary}
       onChange={e=>setContext(prev=>({...prev,experienceSummary:e.target.value}))}
       placeholder="只写自己做过的项目、实习或工作任务，不必填写姓名、手机号等个人资料。"/>
     </label>
    </div>
    {contextAnalysis.signals.length>0&&<div className={styles.contextSignals}>
     <strong>从JD识别的关键词：</strong>{contextAnalysis.signals.join(" · ")}
     <p>经历摘要中提及：{contextAnalysis.mentioned.join("、")||"暂未识别"}；
     尚未提及：{contextAnalysis.notMentioned.join("、")||"无"}。这只是文字匹配，不代表真实掌握或欠缺。</p>
    </div>}
    <p className={styles.small}>默认只保存在本标签页；仅在明确勾选AI语义追问后，相应岗位信息和回答才会发送至模型服务。重新开始会清除本地资料。请勿填写密钥、联系方式、商业机密或第三方个人信息。</p>
   </div>
   {semanticEnabled&&<label className={styles.check}>
    <input type="checkbox" checked={semanticConsent} onChange={e=>setSemanticConsent(e.target.checked)}/>
    启用AI语义追问（自愿）：每次提交主回答时，会将该轮问题、回答及填写的岗位资料发送至{modelProviders.length?modelProviders.join("、"):semanticProvider==="local"?"本站自托管模型":"第三方模型服务"}（含故障备用供应商，如有）用于判断追问。不启用则只在本地按规则追问。请勿提供隐私、密钥或商业机密。
   </label>}
   <p className={styles.small}>提示：{semanticEnabled?"未勾选AI追问时使用原规则；模型失败时自动降级并标注来源。":"当前仅提供规则追问，AI语义模式尚未启用。"}复盘要点由本人核对，不是客观招聘评分。本站原创训练内容，与招聘企业无官方授权关系。</p>
   <label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
    我理解这是一场非标准化自我练习，不是录用评估；不会输入商业机密、真实密钥或其他人的个人信息。
   </label>
   <button className={styles.primary} type="button" disabled={!consent} onClick={start}>开始模拟面试</button>
  </section>}
  {(stage==="main"||stage==="followup")&&<section className={styles.panel}>
   <div className={styles.examTop}>
    <div><strong>第 {index+1} / {profile.questions.length} 轮</strong><span>{question.phase} · {stage==="main"?"主问题":"深入追问"}</span></div>
    <button className={styles.textButton} type="button" onClick={()=>setConfirmReset(true)}>重新开始</button>
   </div>
   {confirmReset&&<div className={styles.resetPrompt}>
    <span>重新开始会清空本标签页的全部练习回答、岗位要求和经历摘要。</span>
    <button type="button" onClick={()=>setConfirmReset(false)}>取消</button>
    <button type="button" onClick={reset}>确认清空</button>
   </div>}
   {stage==="main"&&semanticEnabled&&<label className={styles.check}>
    <input type="checkbox" checked={semanticConsent} onChange={e=>setSemanticConsent(e.target.checked)}/>
    本轮启用AI语义追问（{modelProviders.join("、")|| (semanticProvider==="local"?"本机模型":"第三方模型")}）；仅提交时发送这一轮回答。刷新后默认关闭，可在此重新开启。
   </label>}
   <div className={styles.progress} aria-label="面试进度">
    {profile.questions.map((q,i)=><span key={q.id} data-done={i<index?"true":undefined} data-active={i===index?"true":undefined}/>)}
   </div>
   {(context.targetRole||contextAnalysis.signals.length>0)&&<details className={styles.jobNotes}>
    <summary>本场岗位：{context.targetRole||profile.role} · 查看定制依据</summary>
    <p>JD识别关键词：{contextAnalysis.signals.join("、")||"未识别到预设词条，仍采用原路线题本"}</p>
    <p>经历摘要匹配：{contextAnalysis.mentioned.join("、")||"暂无匹配词条"}。此项仅供自己核对，不用于招聘能力判断。</p>
   </details>}
   <div className={styles.promptCard}>
    <span>面试官 · {stage==="main"?"主问题":entry.followupMode==="guided"?"AI判断 · 预审追问":entry.followupMode==="semantic"?"AI语义追问":"规则追问"}</span>
    <h2>{stage==="main"?question.prompt:entry.followup}</h2>
   </div>
   {stage==="followup"&&(entry.followupMode==="semantic"||entry.followupMode==="guided")&&<p className={styles.small}>
    追问依据：{entry.followupEvidence?`“${entry.followupEvidence}”`:"原回答缺少可核对细节"}；{entry.followupReason}
   </p>}
   {stage==="followup"&&<details className={styles.priorAnswer}>
    <summary>回看刚才的回答</summary>
    <p>{entry.answer}</p>
   </details>}
   <label className={styles.answerLabel} htmlFor="interview-answer">
    {stage==="main"?"你的回答":"补充回答"}
   </label>
   <textarea className={styles.answer} id="interview-answer" rows={8} maxLength={2500} disabled={submitting}
    value={stage==="main"?entry.answer:entry.followupAnswer}
    onChange={e=>updateCurrent(stage==="main"?{answer:e.target.value}:{followupAnswer:e.target.value})}
    placeholder="请按真实经历回答；没有实际工作经历时可以用课程、社团或实习案例，不必虚构。"/>
   <div className={styles.answerFooter}><span>{(stage==="main"?entry.answer:entry.followupAnswer).length} / 2500字</span><span>{semanticEnabled&&semanticConsent?"AI追问已授权 · 本轮提交将发送模型":"本标签页草稿 · 不发送模型"}</span></div>
   <div className={styles.footer}>
    {stage==="followup"&&<button className={styles.secondary} type="button" onClick={()=>setStage("main")}>返回修改主回答</button>}
    <button className={styles.primary} type="button"
     disabled={submitting||!((stage==="main"?entry.answer:entry.followupAnswer).trim())}
     onClick={stage==="main"?confirmMain:next}>
     {stage==="main"?(submitting?"正在生成追问…":"提交本题回答 · 接受追问"):index+1===profile.questions.length?"查看面试复盘":"下一轮面试"}
    </button>
   </div>
  </section>}
  {stage==="review"&&<section className={styles.panel}>
   <span className={styles.status}>复盘 · 基于真实回答的自我核对</span>
   <h2>请核对每轮回答是否包含这些证据</h2>
   <p className={styles.lead}>只有你自己确认的项目才会写入本次完成记录。未勾选的项目会成为改进建议；不能把此清单当成独立专家评分。</p>
   <div className={styles.reviewList}>{profile.questions.map((q,i)=>{
    const value=entries[q.id]??empty();
    return <article key={q.id} className={styles.reviewItem}>
     <div className={styles.reviewHeader}><strong>{i+1}. {q.phase}</strong><span>{value.followupAnswer.trim()?"已回答":"未完整回答"}</span></div>
     <p>{q.goal}</p>
     <div className={styles.criteria}>{q.evidence.map(c=><label className={styles.check} key={c.id}>
      <input type="checkbox" checked={value.selfChecked.includes(c.id)} onChange={e=>{
       const changed=new Set(value.selfChecked);
       if(e.target.checked)changed.add(c.id);else changed.delete(c.id);
       setEntries(prev=>({...prev,[q.id]:{...empty(),...prev[q.id],id:q.id,selfChecked:[...changed]}}));
      }}/><span><strong>{c.label}</strong><small>{c.action}</small></span>
     </label>)}</div>
    </article>;
   })}</div>
   <div className={styles.footer}><button className={styles.primary} onClick={()=>setStage("report")} type="button">生成个人练习复盘</button></div>
  </section>}
  {stage==="report"&&<section className={styles.panel}>
   <span className={styles.status}>已生成 · 本地练习记录</span>
   <h2>本次面试复盘</h2>
   <div className={styles.reportTop}>
    <div><strong>{report.completed}/{report.total}</strong><span>完成完整回答轮次</span></div>
    <div><strong>{report.questions.reduce((n,q)=>n+q.selfReviewed.length,0)}/15</strong><span>本人确认涵盖的证据要点</span></div>
   </div>
   <p className={styles.small}>以上是完成度与本人勾选数量，不是岗位能力分数。所有文字均来自本次真实作答与预先公布的训练要点，不使用AI凭空补写优点。</p>
   <h3>最值得优先改进的内容</h3>
   {report.practicePoints.length?<ul className={styles.points}>{report.practicePoints.map((x,i)=><li key={i}>{x}</li>)}</ul>:<p>你已自行勾选全部要点，下一步请核实这些内容是否都有真实证据，尝试用更准确的数字和案例重新回答。</p>}
   {(context.targetRole||contextAnalysis.signals.length>0)&&<div className={styles.contextSignals}>
    <strong>目标岗位：{context.targetRole||profile.role}</strong>
    <p>JD涉及：{contextAnalysis.signals.join("、")||"未识别到预设关键词"}；经历摘要出现相同词条：{contextAnalysis.mentioned.join("、")||"暂无"}。</p>
    <p>词条匹配不等于技能已验证，报告没有自动推断候选人胜任力。</p>
   </div>}
   <h3>逐轮回答记录</h3>
   <div className={styles.transcript}>{report.questions.map((q,i)=><details key={q.id} open={i===0}>
    <summary>{i+1}. {q.phase} · {q.answered?"已完成":"未完整回答"}</summary>
    <div><strong>主回答</strong><p>{q.answer||"未回答"}</p>
     <strong>面试官追问（{q.followupMode==="guided"?"AI判断 · 预审追问":q.followupMode==="semantic"?"AI语义":"规则"}）</strong><p>{q.followup||"尚未进入追问"}</p>
     {(q.followupMode==="guided"||q.followupMode==="semantic")&&<p>追问依据：{q.followupEvidence||"未引用具体原话"}；{q.followupReason}</p>}
     <strong>补充回答</strong><p>{q.followupAnswer||"未回答"}</p>
     <strong>本人确认的要点</strong><p>{q.selfReviewed.join("、")||"未确认"}</p>
     <strong>下次练习方向</strong><ul>{q.improvement.map((m,j)=><li key={j}>{m}</li>)}</ul>
    </div>
   </details>)}</div>
   <p className={styles.small}>本次记录仅保存在本标签页，关闭后可能丢失；自愿开启AI追问时对应轮次文本会发送给所选模型服务处理，不建立服务器长期面试档案。需要留存可自行打印。不含招聘录取预测或收费权益。</p>
   <div className={styles.footer}>
    <button type="button" className={styles.secondary} onClick={()=>setStage("review")}>修改复盘清单</button>
    <button type="button" className={styles.primary} onClick={()=>window.print()}>打印／保存个人复盘</button>
   </div>
   <p className={styles.nextStep}>继续相关岗位技能训练：<Link href={profile.cohort==="campus"?"/skill-labs/engineering-mock":"/career/exams/procurement-paper-2026q4-v1"}>进入岗位模拟笔试</Link></p>
  </section>}
 </div>;
}
