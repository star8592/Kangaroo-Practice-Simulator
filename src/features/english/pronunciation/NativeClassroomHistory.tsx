"use client";

import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
import styles from "./NativeClassroomHistory.module.css";

const ROOT="/english/pronunciation/classroom-api";
type Classroom={id:string;tenant_id:string;name:string};
type Assignment={id:string;title:string;lifecycle:string;submitted:number;enrolled_total:number;average_best_score:number|null};
type StudentRow={name:string;attempts:number;best_score:number|null;claimed:boolean;submitted:boolean};
type TeacherReport={total:number;submitted:number;students:StudentRow[]};
type Attempt={attempt_id:string;time:string;score:number|null;model_version:string};
type StudentHistory={submitted:boolean;receipt_status:string;attempt_count:number;attempts:Attempt[]};
const UUID="[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const INVITE=new RegExp("^/english/pronunciation/app/a/("+UUID+")/([a-f0-9]{64})/?$","i");

async function read<T>(route:string):Promise<T>{
 const res=await fetch(ROOT+route,{credentials:"same-origin",cache:"no-store"});
 const value:unknown=await res.json().catch(()=>null);
 if(!res.ok){
  const reason=value&&typeof value==="object"&&"error" in value&&typeof value.error==="string"
   ?value.error:"课堂接口 HTTP "+res.status;
  throw new Error(reason);
 }
 return value as T;
}
function score(value:unknown):string{
 return typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100
  ?String(Math.round(value*10)/10):"—";
}
function invitation(text:string):{tenant:string;token:string}|null{
 try{
  const url=new URL(text.trim(),window.location.origin);
  if(![window.location.origin,"https://socthink.cn","https://www.socthink.cn"].includes(url.origin)||url.search||url.hash)return null;
  const match=url.pathname.match(INVITE);
  return match?{tenant:match[1].toLowerCase(),token:match[2].toLowerCase()}:null;
 }catch{return null;}
}
function date(value:string):string{
 const ms=Date.parse(value);
 return Number.isFinite(ms)?new Date(ms).toLocaleString("zh-CN"):"—";
}

export default function NativeClassroomHistory(){
 const [login,setLogin]=useState<"loading"|"yes"|"no">("loading");
 const [authError,setAuthError]=useState("");
 const [teacher,setTeacher]=useState<"loading"|"approved"|"not-approved"|"unavailable">("loading");
 const [classes,setClasses]=useState<Classroom[]>([]);
 const [activeClass,setActiveClass]=useState<Classroom|null>(null);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [activeAssignment,setActiveAssignment]=useState<Assignment|null>(null);
 const [report,setReport]=useState<TeacherReport|null>(null);
 const [teacherError,setTeacherError]=useState("");
 const [teacherBusy,setTeacherBusy]=useState(false);
 const [link,setLink]=useState("");
 const [history,setHistory]=useState<StudentHistory|null>(null);
 const [historyError,setHistoryError]=useState("");
 const [historyBusy,setHistoryBusy]=useState(false);

 useEffect(()=>{
  let alive=true;
  void (async()=>{
   try{
    await read("/me");
    if(!alive)return;
    setLogin("yes");
   }catch(err){
    if(alive){setLogin("no");setAuthError(err instanceof Error?err.message:"请先登录主站");}
    return;
   }
   try{
    const access=await read<{approved:boolean}>("/teacher/access");
    if(!alive)return;
    if(!access.approved){setTeacher("not-approved");return;}
    setTeacher("approved");
    const response=await read<{classes:Classroom[]}>("/teacher/classes");
    if(alive)setClasses(Array.isArray(response.classes)?response.classes:[]);
   }catch(err){
    if(alive){setTeacher("unavailable");setTeacherError(err instanceof Error?err.message:"教师数据暂时不可用");}
   }
  })();
  return ()=>{alive=false;};
 },[]);

 async function openClass(c:Classroom){
  setActiveClass(c);setAssignments([]);setActiveAssignment(null);setReport(null);setTeacherError("");setTeacherBusy(true);
  try{
   const res=await read<{assignments:Assignment[]}>("/tenants/"+c.tenant_id+"/classes/"+c.id+"/assignments/list");
   setAssignments(Array.isArray(res.assignments)?res.assignments:[]);
  }catch(err){setTeacherError(err instanceof Error?err.message:"无法读取班级作业");}
  finally{setTeacherBusy(false);}
 }
 async function openReport(a:Assignment){
  if(!activeClass)return;
  setActiveAssignment(a);setReport(null);setTeacherError("");setTeacherBusy(true);
  try{
   const data=await read<TeacherReport>("/tenants/"+activeClass.tenant_id+"/assignments/"+a.id+"/report");
   setReport(data);
  }catch(err){setTeacherError(err instanceof Error?err.message:"无法读取作业报告");}
  finally{setTeacherBusy(false);}
 }
 async function loadHistory(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setHistory(null);setHistoryError("");
  const parsed=invitation(link);
  if(!parsed){setHistoryError("请粘贴本站老师分享的完整作业链接，其他域名和无效链接不可使用。");return;}
  setHistoryBusy(true);
  try{
   // Existing server checks WeChat identity, verified enrollment and assignment scope.
   const item=await read<{assignment_id:string}>("/tenants/"+parsed.tenant+"/a/"+parsed.token);
   const res=await read<StudentHistory>("/tenants/"+parsed.tenant+"/assignments/"+encodeURIComponent(item.assignment_id)+"/my-attempts");
   setHistory(res);
  }catch(err){setHistoryError(err instanceof Error?err.message:"无法读取本人作业记录");}
  finally{setHistoryBusy(false);}
 }

 return <main className={styles.shell} data-testid="native-classroom-history">
  <div className={styles.eyebrow}>ACCENTLAB · NEXT.JS MIGRATION</div>
  <h1>课堂作业与学习记录</h1>
  <p className={styles.lead}>复用 SOC THINK 统一微信身份、现有课堂数据和服务端权限。当前只读，所有分数均来自已经保存的真实课堂评分。</p>
  {login==="loading"?<p role="status">正在核验主站微信登录…</p>:null}
  {login==="no"?<section className={styles.panel} role="alert"><h2>请先登录主站</h2><p>{authError}</p>
   <Link href="/account">前往统一账户中心</Link>
  </section>:null}
  {login==="yes"?<>
   <section className={styles.panel} aria-label="教师作业报告">
    <header className={styles.heading}><h2>教师 · 班级报告</h2><span>只读</span></header>
    {teacher==="loading"?<p role="status">正在核验教师授权…</p>:null}
    {teacher==="not-approved"?<p>本账号尚无教师权限。你仍可在下方读取自己的学生作业记录。</p>:null}
    {teacher==="unavailable"?<p role="alert" className={styles.error}>教师课堂连接失败：{teacherError}</p>:null}
    {teacher==="approved"?<>
     {classes.length===0?<p>当前账号下暂无已建立的班级；请从正式教师工作台创建。</p>:null}
     <div className={styles.choices} role="group" aria-label="选择本人班级">
      {classes.map(c=><button key={c.id} type="button" aria-pressed={activeClass?.id===c.id}
       disabled={teacherBusy} onClick={()=>void openClass(c)}>{c.name}</button>)}
     </div>
     {activeClass?<div className={styles.section}>
      <h3>{activeClass.name} · 作业</h3>
      {teacherBusy?<p role="status">正在读取真实作业数据…</p>:null}
      {!teacherBusy&&assignments.length===0&&!teacherError?<p>本班级还没有已发布或已结束的作业。</p>:null}
      <div className={styles.choices}>{assignments.map(a=><button key={a.id} type="button" disabled={teacherBusy}
       aria-pressed={activeAssignment?.id===a.id} onClick={()=>void openReport(a)}>
        <strong>{a.title}</strong><small>{a.lifecycle==="closed"?"已结束":"进行中"} · 已交 {a.submitted}/{a.enrolled_total} · 平均最佳分 {score(a.average_best_score)}</small>
       </button>)}</div>
      {teacherError?<p className={styles.error} role="alert">{teacherError}</p>:null}
      {report&&activeAssignment?<div className={styles.section} aria-label="授权班级详细报告">
       <h3>{activeAssignment.title} · 成绩统计</h3><p>提交人数 {report.submitted}/{report.total}</p>
       <div className={styles.scroll}><table><thead><tr><th>学生</th><th>练习次数</th><th>最佳分</th><th>状态</th></tr></thead>
       <tbody>{report.students.map((r,i)=><tr key={i}><th scope="row">{r.name}</th><td>{r.attempts}</td><td>{score(r.best_score)}</td><td>{r.submitted?"已提交":r.claimed?"练习中":"未领取"}</td></tr>)}</tbody></table></div>
      </div>:null}
     </div>:null}
    </>}
    <p className={styles.hint}>建班、发作业、写反馈与录音提交仍在现有正式工作台进行；管理员也不能绕过班级归属读取其他教师的学生数据。</p>
    <Link href="/workspace">打开现有授权工作台</Link>
   </section>
   <section className={styles.panel} aria-label="本人作业历史">
    <header className={styles.heading}><h2>学生 · 我的历史记录</h2><span>仅本人</span></header>
    <p>粘贴老师发到微信群的本站作业链接。服务端验证本人微信账号、作业有效性和实际入班资格。</p>
    <form onSubmit={e=>void loadHistory(e)} className={styles.form}>
     <label htmlFor="native-assignment-link">作业链接</label>
     <input type="url" id="native-assignment-link" value={link} onChange={e=>setLink(e.target.value)}
       placeholder="https://socthink.cn/english/pronunciation/app/a/…" autoComplete="off" spellCheck={false}/>
     <button type="submit" disabled={historyBusy}>{historyBusy?"正在查询…":"查询我的历史"}</button>
    </form>
    {historyError?<p role="alert" className={styles.error}>{historyError}</p>:null}
    {history?<div className={styles.section} aria-label="本人已保存评分">
     <h3>我的作业记录</h3>
     <p>{history.submitted?"已完成":history.receipt_status==="in_progress"?"练习中":"未提交"} · 评分记录 {history.attempt_count} 次</p>
     {history.attempts.length===0?<p>尚无已保存的评分记录。</p>:<div className={styles.scroll}><table><thead><tr><th>时间</th><th>成绩</th><th>评分引擎版本</th></tr></thead>
      <tbody>{history.attempts.map(a=><tr key={a.attempt_id}><td>{date(a.time)}</td><td>{score(a.score)}</td><td>{a.model_version||"未提供"}</td></tr>)}</tbody></table></div>}
    </div>:null}
   </section>
  </>:null}
  <p className={styles.foot}>这是迁移中的只读页，只覆盖既有课堂作业历史，不代表个人自由跟读的全部记录已迁移。课堂 API 不可用时不显示任何模拟数据或假成绩。</p>
  <div className={styles.links}><Link href="/english/pronunciation/next-lab">返回原生跟读</Link><Link href="/english/pronunciation/app/practice-library">使用正式 V3</Link></div>
 </main>;
}
