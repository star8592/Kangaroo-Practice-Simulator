"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { companionTaskState, type CompetitionCompanion as Companion, type CompanionLang } from "@/lib/competition-companion";
import styles from "./CompetitionCompanion.module.css";

type ProgressState = {
  completedTaskIds: string[];
  updatedAt: number;
};

export default function CompetitionCompanion({companion,lang,today}:{companion:Companion;lang:CompanionLang;today:string}) {
 const [progress,setProgress]=useState<ProgressState>({completedTaskIds:[],updatedAt:0});
 const [progressMode,setProgressMode]=useState<"loading"|"saved"|"guest">("loading");
 const [savingTask,setSavingTask]=useState<string|null>(null);

 useEffect(()=>{
   let cancelled=false;
   fetch(`/api/competition-companion/progress?companionId=${encodeURIComponent(companion.id)}`)
     .then(async r=>{
       if(r.status===401){if(!cancelled)setProgressMode("guest");return;}
       if(!r.ok)throw new Error("progress unavailable");
       const data=await r.json();
       if(!cancelled){
         setProgress(data.progress||{completedTaskIds:[],updatedAt:0});
         setProgressMode("saved");
       }
     })
     .catch(()=>{if(!cancelled)setProgressMode("guest")});
   return()=>{cancelled=true};
 },[companion.id]);

 const completed=new Set(progress.completedTaskIds);
 const incomplete=companion.tasks.filter(task=>!completed.has(task.id));
 const next=incomplete.find(task=>companionTaskState(task,today)!=="upcoming")
   || incomplete.find(task=>companionTaskState(task,today)==="upcoming")
   || companion.tasks[companion.tasks.length-1];
 const nextIsCompleted=completed.has(next.id);
 const state=companionTaskState(next,today);
 const completedCount=companion.tasks.filter(task=>completed.has(task.id)).length;

 async function toggleTask(taskId:string){
   if(progressMode!=="saved")return;
   const wasCompleted=completed.has(taskId);
   const optimistic=wasCompleted
     ? progress.completedTaskIds.filter(id=>id!==taskId)
     : [...progress.completedTaskIds,taskId];
   setSavingTask(taskId);
   setProgress({...progress,completedTaskIds:optimistic});
   try{
     const r=await fetch("/api/competition-companion/progress",{
       method:"PATCH",
       headers:{"content-type":"application/json"},
       body:JSON.stringify({companionId:companion.id,taskId,completed:!wasCompleted}),
     });
     if(!r.ok)throw new Error("save failed");
     const data=await r.json();
     setProgress(data.progress);
   }catch{
     setProgress(progress);
   }finally{
     setSavingTask(null);
   }
 }

 return <section className="exam-companion" aria-label={lang==="zh"?"参赛管家":"Exam companion"}>
  <div className="exam-companion__head"><div><span className="eyebrow">{lang==="zh"?"参赛管家 · EXAM COMPANION":"EXAM COMPANION"}</span><h2>{lang==="zh"?companion.titleZh:companion.titleEn}</h2><p>{lang==="zh"?"不用重新研究整份通知。系统按官方要求告诉你现在最该完成什么。":"Turn official instructions into the next clear action."}</p><div className={styles.meta}><span>{companion.mode==="online-home"?(lang==="zh"?"线上居家考试":"Online home-based"):(lang==="zh"?"线下考试":"On-site exam")}</span><b>{lang==="zh"?`已完成 ${completedCount}/${companion.tasks.length}`:`${completedCount}/${companion.tasks.length} completed`}</b></div></div>
   <div className="exam-companion__source"><b>{lang==="zh"?"官方依据":"Official source"}</b><span>{lang==="zh"?companion.sourceLabelZh:companion.sourceLabelEn}</span><small>{lang==="zh"?`核验于 ${companion.verifiedOn} · 仅适用于 ${companion.season} 届`:`Verified ${companion.verifiedOn} · ${companion.season} season only`}</small><a href={companion.sourceUrl} target="_blank" rel="noreferrer">{lang==="zh"?"查看官方 PDF ↗":"Official PDF ↗"}</a></div>
  </div>

  {progressMode==="guest"&&<div className={styles.loginNote}><span>{lang==="zh"?"登录学生账号后，可以跨设备保存每一步完成状态。":"Sign in as a student to save progress across devices."}</span><Link href="/login">{lang==="zh"?"登录并保存进度 →":"Sign in →"}</Link></div>}

  <div className={`exam-companion__next ${nextIsCompleted?styles.nextDone:""}`}><span>{nextIsCompleted?(lang==="zh"?"本届流程已完成":"Journey complete"):state==="upcoming"?(lang==="zh"?"下一件事":"Next action"):(lang==="zh"?"现在最重要的一件事":"Do this now")}</span><h3>{lang==="zh"?next.titleZh:next.titleEn}</h3><p>{nextIsCompleted?(lang==="zh"?"所有当前流程任务都已经确认完成。后续可等待成绩/证书节点更新。":"All current journey tasks are complete. Wait for the result/certificate stage."):lang==="zh"?next.detailZh:next.detailEn}</p>{!nextIsCompleted&&next.actionUrl&&<a className="primary-button" href={next.actionUrl} target="_blank" rel="noreferrer">{lang==="zh"?next.actionZh:next.actionEn} ↗</a>}</div>

  <div className="exam-companion__timeline">{companion.tasks.map((task,index)=>{const taskState=companionTaskState(task,today),checklist=lang==="zh"?task.checklistZh:task.checklistEn,isDone=completed.has(task.id);return <article key={task.id} className={`exam-companion__task exam-companion__task--${taskState} ${isDone?styles.done:""}`}><div className={`exam-companion__marker ${isDone?styles.doneMarker:""}`}>{isDone?"✓":index+1}</div><div><div className="exam-companion__date">{task.date}{task.time?` · ${task.time}`:""}<em>{task.kind==="official"?(lang==="zh"?"官方要求/安排":"Official"):(lang==="zh"?"本站执行清单":"Site checklist")}</em>{taskState==="past"&&!isDone&&<em className={styles.late}>{lang==="zh"?"待确认":"Needs confirmation"}</em>}</div><h3>{lang==="zh"?task.titleZh:task.titleEn}</h3><p>{lang==="zh"?task.detailZh:task.detailEn}</p>{checklist&&<ul>{checklist.map(item=><li key={item}>{item}</li>)}</ul>}{progressMode==="saved"&&<button className={styles.complete} type="button" disabled={savingTask===task.id} onClick={()=>toggleTask(task.id)}>{savingTask===task.id?(lang==="zh"?"保存中…":"Saving…"):isDone?(lang==="zh"?"✓ 已完成 · 点击撤销":"✓ Completed · undo"):(lang==="zh"?"标记为已完成":"Mark complete")}</button>}</div></article>})}</div>
  <p className="exam-companion__disclaimer">{lang==="zh"?"本站负责整理和提醒，不替代主办方。若官方临时更新，以主办方最新通知为准。":"This companion organizes official requirements; the organizer's latest notice always takes precedence."}</p>
 </section>;
}
