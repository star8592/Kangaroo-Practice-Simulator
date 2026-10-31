"use client";

import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {ASSESSMENT_DOMAINS} from "@/lib/assessment-platform";
import {EXAM_MILESTONE_TYPES,EXAM_PLANNER_STORAGE_KEY,
  exportExamPlannerIcs,normalizeExamEntries,type ExamPlannerEntry,type ExamMilestoneType,
  isDateString} from "@/lib/exam-planner";
import {useSiteLanguage} from "@/lib/site-language";
import styles from "./ExamPlanner.module.css";

type Draft=Omit<ExamPlannerEntry,"id">;
const START:Draft={
  domainId:"school",title:"",stage:"written",date:"",time:"",
  location:"",notes:"",remindDays:1,
};
const TEXT={
  zh:{
    eyebrow:"EXAM PLANNER / ALL EXAMS",title:"我的考试管理",lead:"不管是升学考试、语言考试、考公、职业资格还是面试，把重要时间统一管理。",
    overview:"按考试大类归档",add:"添加考试事项",name:"考试或事项名称",nameHint:"例如：2027 国考笔试、雅思考试、复试面试",
    domain:"所属考试领域",type:"关键阶段",date:"日期",time:"具体时间（选填）",
    location:"地点 / 线上入口（选填）",notes:"备注（选填）",reminder:"提前提醒",
    day1:"提前1天",day3:"提前3天",day7:"提前7天",save:"保存到本机",
    myItems:"我记录的时间安排",empty:"还没有记录考试事项。先登记一个真实的报名截止日、笔试或面试时间。",
    dateUnknown:"请确认并填写完整的日期",nameUnknown:"请填写考试事项名称",
    saveError:"此浏览器无法保存数据，请检查无痕模式或存储空间。",invalid:"请填写有效日期和事项名称。",
    local:"当前版本仅在本浏览器保存，不与微信账号同步。换设备或清除浏览器数据可能丢失记录。",
    calendar:"导出日历提醒（.ics）",calendarHelp:"下载后需自行导入手机或电脑日历。文件含提前提醒请求，是否弹出通知由日历软件和系统权限决定；网站当前不会后台推送消息。",
    provenance:"日期由你手动录入，本站不自动验证报名或考试时间，请以官方最新公告为准。",
    remove:"删除",today:"今天",overdue:"已过",remain:"剩余",days:"天",
    math:"数学竞赛赛历与官方来源",mathHelp:"如果你关注数学竞赛，仍可进入原来的专用赛事管家。",
    status:"考试日程",yearNote:"可以记录报名、笔试、面试、资格审核、成绩公布等多个阶段。"
  },
  en:{
    eyebrow:"EXAM PLANNER / ALL EXAMS",title:"My exam planner",lead:"Manage registration, written tests, interviews and results across every exam category.",
    overview:"Categorize across all exams",add:"Add a milestone",name:"Exam or milestone title",nameHint:"e.g. IELTS test, exam interview",
    domain:"Exam category",type:"Milestone type",date:"Date",time:"Time (optional)",
    location:"Location / online details (optional)",notes:"Notes (optional)",reminder:"Calendar alert",
    day1:"1 day before",day3:"3 days before",day7:"7 days before",save:"Save on this device",
    myItems:"My upcoming dates",empty:"Nothing saved yet. Add a registration deadline, test or interview.",
    dateUnknown:"Please enter a complete date",nameUnknown:"Please enter a milestone title",
    saveError:"This browser cannot store your plan. Check private mode or available storage.",invalid:"Enter a valid date and title.",
    local:"This version saves only in this browser, not your WeChat account. Clearing storage or switching devices may remove entries.",
    calendar:"Export calendar alerts (.ics)",calendarHelp:"Import the downloaded file into your calendar. Its alert requests depend on calendar support and notification permissions. This website does not send background reminders.",
    provenance:"You entered the dates; verify all official registration and examination times independently.",
    remove:"Remove",today:"Today",overdue:"Past",remain:"In",days:"days",
    math:"Math competition event directory",mathHelp:"The existing math-specific event manager remains available.",
    status:"Exam schedule",yearNote:"Track registration, exam days, interviews, document checks and results separately."
  }
} as const;

const domainNames=new Map<string,(typeof ASSESSMENT_DOMAINS)[number]>(ASSESSMENT_DOMAINS.map(domain=>[domain.id,domain]));

function dateDistance(iso:string):number{
  const now=new Date();
  const current=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const [y,m,d]=iso.split("-").map(Number);
  return Math.round((new Date(y,m-1,d).getTime()-current.getTime())/86400000);
}

export default function ExamPlannerClient(){
  const lang=useSiteLanguage(),t=TEXT[lang];
  const [items,setItems]=useState<ExamPlannerEntry[]>([]);
  const [draft,setDraft]=useState<Draft>(START);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    // Hydrate browser-only storage after the first client paint. No server state
    // or synchronous effect-to-state cascade, and strict-mode cleanup is safe.
    const frame=window.requestAnimationFrame(()=>{
      try{
        const saved=window.localStorage.getItem(EXAM_PLANNER_STORAGE_KEY);
        if(saved)setItems(normalizeExamEntries(JSON.parse(saved),ASSESSMENT_DOMAINS.map(x=>x.id)));
      }catch{
        setError(TEXT.zh.saveError);
      }
      setLoaded(true);
    });
    return()=>window.cancelAnimationFrame(frame);
  },[]);

  const sorted=useMemo(()=>[...items].sort((a,b)=>
    (a.date+"T"+(a.time||"00:00")).localeCompare(b.date+"T"+(b.time||"00:00"))),[items]);

  function persist(next:ExamPlannerEntry[]):boolean{
    try{
      window.localStorage.setItem(EXAM_PLANNER_STORAGE_KEY,JSON.stringify(next));
      setItems(next);
      setError("");
      return true;
    }catch{
      setError(t.saveError);
      return false;
    }
  }

  function add(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!draft.title.trim()){setError(t.nameUnknown);return;}
    if(!isDateString(draft.date)){setError(t.dateUnknown);return;}
    if(items.length>=100){setError(lang==="zh"?"单设备最多记录100项，请先清理过期事项。":"Up to 100 entries per device.");return;}
    const id="e"+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
    const next=[...items,{...draft,id,title:draft.title.trim()}];
    if(persist(next))setDraft(START);
  }

  function remove(id:string){
    persist(items.filter(row=>row.id!==id));
  }

  function downloadCalendar(){
    if(!sorted.length)return;
    const ics=exportExamPlannerIcs(sorted);
    const url=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;
    link.download="socthink-exam-plan.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <div data-site-shell="content" className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <p>{t.lead}</p>
      <span className={styles.heroDetail}>{t.yearNote}</span>
    </section>

    <div className={styles.grid}>
      <section className={styles.formPanel} aria-label={t.add}>
        <h2>{t.add}</h2>
        <p>{t.overview}</p>
        <form onSubmit={add} className={styles.form}>
          <label>{t.name}
            <input type="text" required maxLength={120} value={draft.title}
              placeholder={t.nameHint} onChange={e=>setDraft(old=>({...old,title:e.target.value}))}/>
          </label>
          <label>{t.domain}
            <select value={draft.domainId} onChange={e=>setDraft(old=>({...old,domainId:e.target.value}))}>
              {ASSESSMENT_DOMAINS.map(domain=>
                <option key={domain.id} value={domain.id}>{domain.name[lang]}</option>)}
            </select>
          </label>
          <label>{t.type}
            <select value={draft.stage} onChange={e=>
              setDraft(old=>({...old,stage:e.target.value as ExamMilestoneType}))}>
              {EXAM_MILESTONE_TYPES.map(stage=><option key={stage.id} value={stage.id}>{stage[lang]}</option>)}
            </select>
          </label>
          <div className={styles.dateRow}>
            <label>{t.date}
              <input type="date" required value={draft.date}
                onChange={e=>setDraft(old=>({...old,date:e.target.value}))}/>
            </label>
            <label>{t.time}
              <input type="time" value={draft.time}
                onChange={e=>setDraft(old=>({...old,time:e.target.value}))}/>
            </label>
          </div>
          <label>{t.location}
            <input type="text" maxLength={180} value={draft.location}
              onChange={e=>setDraft(old=>({...old,location:e.target.value}))}/>
          </label>
          <label>{t.notes}
            <textarea rows={2} maxLength={400} value={draft.notes}
              onChange={e=>setDraft(old=>({...old,notes:e.target.value}))}/>
          </label>
          <label>{t.reminder}
            <select value={draft.remindDays} onChange={e=>
              setDraft(old=>({...old,remindDays:Number(e.target.value)}))}>
              <option value={1}>{t.day1}</option>
              <option value={3}>{t.day3}</option>
              <option value={7}>{t.day7}</option>
            </select>
          </label>
          <button type="submit" className={styles.primary}>{t.save}</button>
          {error&&<p role="alert" className={styles.error}>{error}</p>}
        </form>
        <p className={styles.disclosure}>{t.local}</p>
      </section>

      <section className={styles.listPanel} aria-label={t.myItems}>
        <div className={styles.listHead}>
          <div><h2>{t.myItems}</h2><p>{t.provenance}</p></div>
          <strong className={styles.count}>{loaded?sorted.length:"…"}</strong>
        </div>
        <button className={styles.export} type="button" disabled={!sorted.length} onClick={downloadCalendar}>
          {t.calendar}
        </button>
        <p className={styles.disclosure}>{t.calendarHelp}</p>
        {loaded&&sorted.length===0&&<p className={styles.empty}>{t.empty}</p>}
        <div className={styles.entries}>
          {sorted.map(row=>{
            const stage=EXAM_MILESTONE_TYPES.find(x=>x.id===row.stage);
            const distance=dateDistance(row.date);
            return <article className={styles.entry} key={row.id}>
              <div className={styles.entryTop}>
                <span>{domainNames.get(row.domainId)?.name[lang]||row.domainId}</span>
                <span>{stage?.[lang]}</span>
              </div>
              <h3>{row.title}</h3>
              <div className={styles.entryDate}>
                <time dateTime={row.date+(row.time?"T"+row.time:"")}>
                  {row.date}{row.time?" "+row.time:""}
                </time>
                <strong>{distance===0?t.today:distance<0?t.overdue:t.remain+" "+distance+" "+t.days}</strong>
              </div>
              {row.location&&<p>{row.location}</p>}
              {row.notes&&<p>{row.notes}</p>}
              <button className={styles.remove} type="button" onClick={()=>remove(row.id)}>{t.remove}</button>
            </article>;
          })}
        </div>
      </section>
    </div>
    <aside className={styles.mathLink}>
      <div><h2>{t.math}</h2><p>{t.mathHelp}</p></div>
      <Link href="/events">{lang==="zh"?"打开数学赛事管家":"Open math events"} →</Link>
    </aside>
  </div>;
}
