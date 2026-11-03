"use client";
import {useEffect,useState} from "react";
import {AGENT_PROJECT_MODULES,AGENT_PROJECT_ID} from "@/lib/agent-project-course";
import s from "./AgentProjectCourse.module.css";

const KEY="socthink:career-project:"+AGENT_PROJECT_ID;
const max=AGENT_PROJECT_MODULES.length;

export default function AgentProjectCourse(){
 const [active,setActive]=useState(0);
 const [selected,setSelected]=useState<number|null>(null);
 const [evaluated,setEvaluated]=useState(false);
 const [completed,setCompleted]=useState<string[]>([]);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  try{
   const value=JSON.parse(localStorage.getItem(KEY)??"[]");
   if(Array.isArray(value))setCompleted(value.filter((v):v is string=>
    typeof v==="string"&&AGENT_PROJECT_MODULES.some(m=>m.id===v)));
  }catch{/* Browser storage is optional; the lesson remains usable. */}
  setReady(true);
 },[]);
 const item=AGENT_PROJECT_MODULES[active];
 const correct=selected===item.answer;
 function move(index:number){setActive(index);setSelected(null);setEvaluated(false);}
 function check(){
  if(selected===null)return;
  setEvaluated(true);
  if(!correct||completed.includes(item.id))return;
  const next=[...completed,item.id];
  setCompleted(next);
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{/* no persistence */ }
 }
 return <section className={s.shell} id="agent-project" aria-labelledby="agent-project-heading">
  <div className={s.header}>
   <div>
    <span className={s.eyebrow}>PROJECT LAB · 真实工程案例</span>
    <h2 id="agent-project-heading">完成一个可解释的工单 Agent</h2>
    <p>六个短模块，从输入契约到故障降级。每节都有代码依据、动手任务和即时核对；自由选择顺序，不强制解锁。</p>
   </div>
   <div className={s.progress} aria-label="本浏览器的知识检查进度">
    <strong>{completed.length}/{max}</strong>
    <span>知识检查已通过</span>
    <div className={s.progressBar} aria-hidden="true"><i style={{width:`${completed.length/max*100}%`}}/></div>
   </div>
  </div>
  <div className={s.content}>
   <nav className={s.menu} aria-label="项目课程章节">
    {AGENT_PROJECT_MODULES.map((m,i)=><button type="button" key={m.id}
      className={s.menuItem+(active===i?" "+s.menuActive:"")}
      aria-current={active===i?"step":undefined} onClick={()=>move(i)}>
      <span className={s.num}>{String(i+1).padStart(2,"0")}</span>
      <span className={s.menuText}><strong>{m.title}</strong><small>{m.time}</small></span>
      {completed.includes(m.id)&&<span className={s.done} aria-label="知识检查已通过">✓</span>}
    </button>)}
   </nav>
   <article className={s.lesson} aria-labelledby="project-lesson-title">
    <div className={s.lessonTop}><span>模块 {active+1} / {max}</span><span>{item.time}</span></div>
    <h3 id="project-lesson-title">{item.title}</h3>
    <p className={s.goal}>{item.goal}</p>
    <h4>关键原理</h4><p>{item.concept}</p>
    <div className={s.codeHead}>Python 参考片段 · 原创离线项目</div>
    <pre className={s.code}><code>{item.code}</code></pre>
    <div className={s.assignment}><strong>本节动手任务</strong><p>{item.assignment}</p>
      <details><summary>查看预期验收结果</summary><p>{item.expected}</p></details>
    </div>
    <div className={s.exercise}>
     <h4>知识检查</h4><p className={s.question}>{item.question}</p>
     <div className={s.options} role="group" aria-label={item.question}>
      {item.options.map((option,i)=><label key={option} className={s.option+(selected===i?" "+s.chosen:"")}>
       <input type="radio" name={"agent-check-"+item.id} value={i}
         checked={selected===i} onChange={()=>{setSelected(i);setEvaluated(false);}}/>
       <span>{option}</span>
      </label>)}
     </div>
     <button type="button" className={s.checkButton} disabled={selected===null} onClick={check}>核对这道题</button>
     {evaluated&&<p role="status" className={correct?s.success:s.retry}>
      <strong>{correct?"知识检查通过":"还不准确，建议再试"}</strong> · {item.why}
     </p>}
     <p className={s.micro}>此项只核对课程概念，不是代码自动批改、职业能力评分或证书。</p>
    </div>
    <div className={s.next}>
     <button type="button" disabled={active===0} onClick={()=>move(active-1)}>上一模块</button>
     <button type="button" disabled={active===max-1} onClick={()=>move(active+1)}>下一模块 →</button>
    </div>
   </article>
  </div>
  <p className={s.notice}>{ready?"进度仅保存在当前浏览器；清除浏览数据会丢失，不会同步到账号。":"课程可直接阅读，无须登录。"} 工程项目的 24 项 Python 测试需在本地真实运行，网页知识检查不能替代执行结果。完整工程资料尚未作为付费课程开放。</p>
 </section>;
}
