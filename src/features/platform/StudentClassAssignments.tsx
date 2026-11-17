"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {
  type StudentClassAssignment,type StudentTaskHistory,type StudentTaskItems,
  validAssignment,assignmentStatus,scoreLabel,
} from "./student-class-assignment-model";
import styles from "@/app/my/learning/learning-dashboard.module.css";

const ROOT="/english/pronunciation/classroom-api";
const ID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
async function get<T>(url:string,signal?:AbortSignal):Promise<T>{
 const res=await fetch(url,{credentials:"same-origin",cache:"no-store",signal});
 const body:unknown=await res.json().catch(()=>null);
 if(!res.ok){
  const msg=body&&typeof body==="object"&&"error" in body&&typeof body.error==="string"
   ?body.error:"课堂服务 HTTP "+res.status;
  throw Error(msg);
 }
 return body as T;
}

/** Read-only schoolwork cockpit. It never manufactures a time, grade, or
 * invite token; an expired group link cannot be silently re-created. */
export default function StudentClassAssignments({tenant,classId}:{
 tenant:string;classId:string;
}){
 const [items,setItems]=useState<StudentClassAssignment[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<string|null>(null);
 const [detail,setDetail]=useState<{task:StudentTaskItems;history:StudentTaskHistory}|null>(null);
 const [detailLoading,setDetailLoading]=useState(false);
 const [detailError,setDetailError]=useState("");
 const base=ROOT+"/student/tenants/"+tenant+"/classes/"+classId+"/assignments";

 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  if(!ID.test(tenant)||!ID.test(classId))return;
  void get<{assignments:unknown[]}>(base,controller.signal).then(value=>{
   if(!active)return;
   const valid=Array.isArray(value.assignments)?
    value.assignments.filter(validAssignment).slice(0,100):[];
   setItems(valid);
  }).catch(e=>{if(active&&e instanceof Error&&e.name!=="AbortError")setError(e.message);})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.abort();};
 },[base,tenant,classId]);

 async function openTask(task:StudentClassAssignment){
  if(detailLoading)return;
  if(selected===task.id){setSelected(null);setDetail(null);setDetailError("");return;}
  if(!ID.test(task.id))return;
  setSelected(task.id);setDetail(null);setDetailError("");setDetailLoading(true);
  try{
   const historyUrl=ROOT+"/tenants/"+tenant+"/assignments/"+task.id+"/my-attempts";
   const taskUrl=ROOT+"/student/tenants/"+tenant+"/assignments/"+task.id+"/items";
   const [taskData,historyData]=await Promise.all([
    get<StudentTaskItems>(taskUrl),get<StudentTaskHistory>(historyUrl)
   ]);
   setDetail({task:taskData,history:historyData});
  }catch(e){setDetailError(e instanceof Error?e.message:"暂时无法读取该作业");}
  finally{setDetailLoading(false);}
 }
 const invalid=!ID.test(tenant)||!ID.test(classId);
 const visibleError=invalid?"课堂编号无效":error;
 const pending=items.filter(a=>a.lifecycle==="published"&&!a.submitted).length;
 const finished=items.filter(a=>a.submitted).length;
 return <section className={styles.taskSection} aria-labelledby="student-class-tasks">
  <div className={styles.taskHeader}>
   <h4 id="student-class-tasks">老师布置的跟读作业</h4>
   {!loading&&!visibleError?<span className={styles.taskCounts}>待完成 {pending} · 已提交 {finished}</span>:null}
  </div>
  {loading&&!invalid?<p role="status" className={styles.taskNotice}>正在读取本班真实作业…</p>:null}
  {visibleError?<p role="alert" className={styles.classError}>本班作业读取失败：{visibleError}。这不影响你继续自主学习。</p>:null}
  {!loading&&!visibleError&&items.length===0?<p className={styles.taskNotice}>老师暂未发布跟读作业。你仍可以在下面继续自主发音练习。</p>:null}
  {!visibleError&&items.length>0?<div className={styles.taskList}>
   {items.map(task=><div className={styles.taskCard} key={task.id}>
    <div className={styles.taskCardBody}>
     <div className={styles.taskTitle}><strong>{task.title}</strong>
      <span className={styles.taskStatus}>{assignmentStatus(task)}</span></div>
     <p>{task.sentence_count} 句跟读 · 已保存评分 {task.attempt_count} 次 · 最佳 {scoreLabel(task.best_score)}
      {task.feedback_count>0?" · 老师反馈 "+task.feedback_count+" 条":""}</p>
    </div>
    <button type="button" onClick={()=>void openTask(task)}
     aria-expanded={selected===task.id} aria-controls={"student-task-detail-"+task.id}>
     {selected===task.id?"收起作业":"查看作业与反馈"}
    </button>
    {selected===task.id?<div id={"student-task-detail-"+task.id} className={styles.taskDetails}>
      {detailLoading?<p role="status">正在核对本人的作业和反馈…</p>:null}
      {detailError?<p role="alert" className={styles.classError}>{detailError}</p>:null}
      {detail&&!detailLoading?<div>
        <h5>本次要练习的句子</h5>
        <ol>{Array.isArray(detail.task.items)&&detail.task.items.length?
          detail.task.items.map((item,i)=><li key={i}>{item.sentence}</li>):
          <li>当前作业暂无已发布的句子。</li>}</ol>
        <h5>我的练习结果</h5>
        <p>{detail.history.submitted?"作业已提交":"作业未提交"} · 已保存 {detail.history.attempt_count} 条评分记录</p>
        {Array.isArray(detail.history.attempts)&&detail.history.attempts.length?
         <div className={styles.taskScores}>
          {detail.history.attempts.slice(0,6).map(h=><span key={h.attempt_id}>
            {scoreLabel(h.score)} · {new Date(h.time).toLocaleDateString("zh-CN")}
          </span>)}
         </div>:<p>还没有本作业的有效录音评分。</p>}
        {Array.isArray(detail.history.teacher_feedback)&&detail.history.teacher_feedback.length?
          <div className={styles.taskFeedback}><h5>老师给我的反馈</h5>
           {detail.history.teacher_feedback.map((f,i)=><p key={i}>{f.comment}</p>)}
          </div>:<p>老师暂未针对本作业留下反馈。</p>}
        <p className={styles.taskInstruction}>查看句子和历史无需重新索要链接；如需领取、正式录音评分和提交作业，请使用老师在微信群发出的原作业链接。该链接是具有有效期的安全凭证。</p>
        <Link href="/english/pronunciation/next-lab/assignments">使用老师的作业链接继续练习 →</Link>
       </div>:null}
     </div>:null}
   </div>)}
  </div>:null}
 </section>;
}
