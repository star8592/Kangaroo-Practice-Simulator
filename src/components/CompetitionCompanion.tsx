"use client";
import { companionTaskState, type CompetitionCompanion as Companion, type CompanionLang } from "@/lib/competition-companion";

export default function CompetitionCompanion({companion,lang,today}:{companion:Companion;lang:CompanionLang;today:string}) {
 const current=companion.tasks.find(x=>companionTaskState(x,today)==="current");
 const next=current||companion.tasks.find(x=>companionTaskState(x,today)==="upcoming")||companion.tasks[companion.tasks.length-1];
 return <section className="exam-companion" aria-label={lang==="zh"?"参赛管家":"Exam companion"}>
  <div className="exam-companion__head"><div><span className="eyebrow">{lang==="zh"?"参赛管家 · EXAM COMPANION":"EXAM COMPANION"}</span><h2>{lang==="zh"?companion.titleZh:companion.titleEn}</h2><p>{lang==="zh"?"不用重新研究整份通知。系统按官方要求告诉你现在最该完成什么。":"Turn official instructions into the next clear action."}</p></div>
   <div className="exam-companion__source"><b>{lang==="zh"?"官方依据":"Official source"}</b><span>{lang==="zh"?companion.sourceLabelZh:companion.sourceLabelEn}</span><small>{lang==="zh"?`核验于 ${companion.verifiedOn} · 仅适用于 ${companion.season} 届`:`Verified ${companion.verifiedOn} · ${companion.season} season only`}</small><a href={companion.sourceUrl} target="_blank" rel="noreferrer">{lang==="zh"?"查看官方 PDF ↗":"Official PDF ↗"}</a></div>
  </div>
  <div className="exam-companion__next"><span>{current?(lang==="zh"?"现在最重要的一件事":"Do this now"):(lang==="zh"?"下一件事":"Next action")}</span><h3>{lang==="zh"?next.titleZh:next.titleEn}</h3><p>{lang==="zh"?next.detailZh:next.detailEn}</p>{next.actionUrl&&<a className="primary-button" href={next.actionUrl} target="_blank" rel="noreferrer">{lang==="zh"?next.actionZh:next.actionEn} ↗</a>}</div>
  <div className="exam-companion__timeline">{companion.tasks.map((task,index)=>{const state=companionTaskState(task,today),checklist=lang==="zh"?task.checklistZh:task.checklistEn;return <article key={task.id} className={`exam-companion__task exam-companion__task--${state}`}><div className="exam-companion__marker">{index+1}</div><div><div className="exam-companion__date">{task.date}{task.time?` · ${task.time}`:""}<em>{task.kind==="official"?(lang==="zh"?"官方要求/安排":"Official"):(lang==="zh"?"本站执行清单":"Site checklist")}</em></div><h3>{lang==="zh"?task.titleZh:task.titleEn}</h3><p>{lang==="zh"?task.detailZh:task.detailEn}</p>{checklist&&<ul>{checklist.map(item=><li key={item}>{item}</li>)}</ul>}</div></article>})}</div>
  <p className="exam-companion__disclaimer">{lang==="zh"?"本站负责整理和提醒，不替代主办方。若官方临时更新，以主办方最新通知为准。":"This companion organizes official requirements; the organizer's latest notice always takes precedence."}</p>
 </section>;
}
