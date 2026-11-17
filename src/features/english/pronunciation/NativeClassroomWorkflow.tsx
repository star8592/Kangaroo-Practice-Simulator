"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import styles from "./NativeClassroomWorkflow.module.css";

const API="/english/pronunciation/classroom-api";
type ClassRoom={id:string;tenant_id:string;name:string};
type Sentence={id:string;sentence_set_id:string;sentence:string;set_title:string;ordinal:number};
type Assignment={id:string;title:string;lifecycle:string;submitted:number;enrolled_total:number};
type JoinRequest={id:string;student_name:string;grade_label:string};
type Student={student_id:string;name:string;attempts:number;best_score:number|null;claimed:boolean;submitted:boolean};
type Feedback={student_id:string;comment:string;at:string};
type Report={total:number;submitted:number;students:Student[];teacher_feedback:Feedback[]};
type StudentItem={sentence_id:string;sentence:string;ordinal:number};
type StudentTask={assignment_id:string;title:string;items:StudentItem[]};
type Attempt={attempt_id:string;score:number|null;sentence_id:string;time:string};
type History={submitted:boolean;receipt_status:string;attempt_count:number;attempts:Attempt[]};
type Invite={tenant:string;token:string};
type Scored={sentenceId:string;score:number;submitted:boolean};
const UUID="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const SHARED=new RegExp("^/english/pronunciation/app/a/("+UUID+")/([a-f0-9]{64})/?$","i");
function validateShare(text:string):Invite|null{
 try{
  const url=new URL(text.trim());
  if(!["https://socthink.cn","https://www.socthink.cn"].includes(url.origin)||url.search||url.hash)return null;
  const match=url.pathname.match(SHARED);
  return match?{tenant:match[1].toLowerCase(),token:match[2].toLowerCase()}:null;
 }catch{return null;}
}
function validScore(value:unknown):value is number{
 return typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
}
function displayScore(value:unknown){return validScore(value)?String(Math.round(value*10)/10):"—"}
async function read<T>(path:string):Promise<T>{
 const response=await fetch(API+path,{credentials:"same-origin",cache:"no-store"});
 const data:unknown=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(explain(data,response.status));
 return data as T;
}
function explain(value:unknown,status:number):string{
 return value&&typeof value==="object"&&"error" in value&&typeof value.error==="string"
  ?value.error:"课堂服务 HTTP "+status;
}
async function write<T>(path:string,data:unknown):Promise<T>{
 const response=await fetch(API+path,{method:"POST",credentials:"same-origin",cache:"no-store",
  headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 const body:unknown=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(explain(body,response.status));
 return body as T;
}

export default function NativeClassroomWorkflow(){
 const [authentication,setAuthentication]=useState<"loading"|"ready"|"denied">("loading");
 const [identityError,setIdentityError]=useState("");
 const [mode,setMode]=useState<"teacher"|"student">("student");
 const [teacherAccess,setTeacherAccess]=useState<"loading"|"approved"|"not-approved"|"unavailable">("loading");
 const [classes,setClasses]=useState<ClassRoom[]>([]);
 const [className,setClassName]=useState("");
 const [activeClass,setActiveClass]=useState<ClassRoom|null>(null);
 const [catalog,setCatalog]=useState<Sentence[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [joins,setJoins]=useState<JoinRequest[]>([]);
 const [setId,setSetId]=useState("");
 const [selected,setSelected]=useState<string[]>([]);
 const [title,setTitle]=useState("");
 const [shareUrl,setShareUrl]=useState("");
 const [reportTitle,setReportTitle]=useState("");
 const [reportId,setReportId]=useState("");
 const [report,setReport]=useState<Report|null>(null);
 const [feedbackStudent,setFeedbackStudent]=useState("");
 const [feedbackText,setFeedbackText]=useState("");
 const [teacherBusy,setTeacherBusy]=useState(false);
 const [teacherError,setTeacherError]=useState("");
 const [teacherNotice,setTeacherNotice]=useState("");

 const [shareInput,setShareInput]=useState("");
 const [invitation,setInvitation]=useState<Invite|null>(null);
 const [joinState,setJoinState]=useState<"idle"|"new"|"pending"|"approved"|"rejected">("idle");
 const [studentName,setStudentName]=useState("");
 const [grade,setGrade]=useState("G6");
 const [task,setTask]=useState<StudentTask|null>(null);
 const [claimed,setClaimed]=useState(false);
 const [history,setHistory]=useState<History|null>(null);
 const [itemIndex,setItemIndex]=useState(0);
 const [recordBlob,setRecordBlob]=useState<Blob|null>(null);
 const [recordUrl,setRecordUrl]=useState("");
 const [recording,setRecording]=useState(false);
 const [uploading,setUploading]=useState(false);
 const [studentBusy,setStudentBusy]=useState(false);
 const [studentError,setStudentError]=useState("");
 const [studentNotice,setStudentNotice]=useState("");
 const [latest,setLatest]=useState<Scored|null>(null);
 const media=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const requestId=useRef("");
 const classRequest=useRef(0);
 const studentRequest=useRef(0);

 const stopMedia=()=>{
  if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
  if(media.current?.state==="recording")media.current.stop();
  stream.current?.getTracks().forEach(t=>t.stop());
  stream.current=null;
 };
 useEffect(()=>()=>{stopMedia()},[]);
 useEffect(()=>{
  if(!recordBlob){setRecordUrl("");return;}
  const url=URL.createObjectURL(recordBlob);setRecordUrl(url);
  return ()=>URL.revokeObjectURL(url);
 },[recordBlob]);

 useEffect(()=>{
  let live=true;
  void (async()=>{
   try{await read("/me");if(!live)return;setAuthentication("ready");}
   catch(error){
    if(live){setAuthentication("denied");setIdentityError(error instanceof Error?error.message:"统一微信身份暂不可用");}
    return;
   }
   try{
    const a=await read<{approved:boolean}>("/teacher/access");
    if(!live)return;
    if(!a.approved){setTeacherAccess("not-approved");return;}
    setTeacherAccess("approved");
    const response=await read<{classes:ClassRoom[]}>("/teacher/classes");
    if(!live)return;
    setClasses(Array.isArray(response.classes)?response.classes:[]);
    setMode("teacher");
   }catch(error){
    if(live){setTeacherAccess("unavailable");setTeacherError(error instanceof Error?error.message:"教师授权服务不可用");}
   }
  })();
  return ()=>{live=false;};
 },[]);
 const visibleSets=useMemo(()=>Array.from(new Map(catalog.map(x=>[x.sentence_set_id,x.set_title])).entries()),[catalog]);
 const visibleSentences=useMemo(()=>catalog.filter(x=>x.sentence_set_id===setId),[catalog,setId]);
 const currentItem=task?.items[itemIndex];

 async function loadClass(c:ClassRoom){
  const request=++classRequest.current;
  setTeacherBusy(true);setTeacherError("");setTeacherNotice("");setActiveClass(c);
  setCatalog([]);setAssignments([]);setJoins([]);setShareUrl("");setSetId("");setSelected([]);setReport(null);setReportTitle("");setReportId("");
  try{
   const base="/tenants/"+c.tenant_id+"/classes/"+c.id;
   const [items,records,pending]=await Promise.all([
    read<{items:Sentence[]}>(base+"/catalog"),
    read<{assignments:Assignment[]}>(base+"/assignments/list"),
    read<{requests:JoinRequest[]}>(base+"/join-requests")
   ]);
   if(request!==classRequest.current)return;
   const all=Array.isArray(items.items)?items.items:[];
   setCatalog(all);setSetId(all[0]?.sentence_set_id||"");
   setAssignments(Array.isArray(records.assignments)?records.assignments:[]);
   setJoins(Array.isArray(pending.requests)?pending.requests:[]);
  }catch(error){if(request===classRequest.current)setTeacherError(error instanceof Error?error.message:"班级数据无法读取");}
  finally{if(request===classRequest.current)setTeacherBusy(false);}
 }
 async function refreshClass(){
  if(activeClass)await loadClass(activeClass);
 }
 async function createClass(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(teacherBusy)return;
  setTeacherBusy(true);setTeacherError("");setTeacherNotice("");
  try{
   const endpoint=classes.length?"/teacher/classes/create":"/teacher/onboard";
   const created=await write<{class_id:string;tenant_id:string;class_name:string}>(endpoint,{class_name:className.trim()});
   const refreshed=await read<{classes:ClassRoom[]}>("/teacher/classes");
   setClasses(refreshed.classes);
   setClassName("");
   const next=refreshed.classes.find(c=>c.id===created.class_id);
   if(next){setTeacherBusy(false);await loadClass(next);}
   setTeacherNotice("班级已创建，可选择句子布置作业");
  }catch(error){setTeacherError(error instanceof Error?error.message:"班级创建失败");}
  finally{setTeacherBusy(false);}
 }
 async function publishAssignment(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!activeClass||!setId||!selected.length||teacherBusy)return;
  setTeacherBusy(true);setTeacherError("");setTeacherNotice("");setShareUrl("");
  try{
   const base="/tenants/"+activeClass.tenant_id+"/classes/"+activeClass.id;
   const result=await write<{share_url:string;assignment_id:string}>(base+"/assignments",{
    title:title.trim(),sentence_set_id:setId,sentence_ids:selected
   });
   if(!result.share_url||!validateShare(result.share_url))throw Error("已创建作业，但服务器未返回可验证的分享链接，请从正式工作台核对");
   setShareUrl(result.share_url);setTitle("");setSelected([]);
   const next=await read<{assignments:Assignment[]}>(base+"/assignments/list");
   setAssignments(next.assignments);
   setTeacherNotice("作业已发布，请复制真实分享链接到微信群");
  }catch(error){setTeacherError(error instanceof Error?error.message:"发布失败，请先核对作业列表，避免重复发布");}
  finally{setTeacherBusy(false);}
 }
 async function approveJoin(request:JoinRequest){
  if(!activeClass||teacherBusy)return;
  setTeacherBusy(true);setTeacherError("");
  try{
   const base="/tenants/"+activeClass.tenant_id+"/classes/"+activeClass.id;
   const result=await write<{status:string}>(base+"/join-requests/"+request.id+"/decision",{approve:true});
   if(result.status!=="approved")throw Error("审批尚未完成");
   const remaining=await read<{requests:JoinRequest[]}>(base+"/join-requests");
   setJoins(remaining.requests);setTeacherNotice("已批准 "+request.student_name+" 入班");
  }catch(error){setTeacherError(error instanceof Error?error.message:"审批未完成");}
  finally{setTeacherBusy(false);}
 }
 async function showReport(a:Assignment){
  if(!activeClass||teacherBusy)return;
  setTeacherBusy(true);setTeacherError("");setReport(null);setFeedbackStudent("");setReportTitle(a.title);setReportId(a.id);
  try{
   const data=await read<Report>("/tenants/"+activeClass.tenant_id+"/assignments/"+a.id+"/report");
   setReport(data);
  }catch(error){setTeacherError(error instanceof Error?error.message:"作业报告未能读取");}
  finally{setTeacherBusy(false);}
 }
 async function addFeedback(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!activeClass||!report||!feedbackStudent||teacherBusy)return;
  if(!reportId){setTeacherError("当前作业标识缺失，请重新打开报告");return;}
  setTeacherBusy(true);setTeacherError("");setTeacherNotice("");
  try{
   const path="/tenants/"+activeClass.tenant_id+"/assignments/"+reportId;
   const result=await write<{saved:boolean}>(path+"/feedback",{
    student_id:feedbackStudent,attempt_id:null,word_position:null,comment:feedbackText.trim()
   });
   if(result.saved!==true)throw Error("教师反馈未确认保存");
   setFeedbackText("");setFeedbackStudent("");
   setReport(await read<Report>(path+"/report"));
   setTeacherNotice("反馈已写入原课堂数据库");
  }catch(error){setTeacherError(error instanceof Error?error.message:"反馈保存失败");}
  finally{setTeacherBusy(false);}
 }
 async function renewInvite(a:Assignment){
  if(!activeClass||teacherBusy)return;
  setTeacherBusy(true);setTeacherError("");setTeacherNotice("");
  try{
   const result=await write<{share_url:string;old_links_revoked:boolean}>(
    "/tenants/"+activeClass.tenant_id+"/assignments/"+a.id+"/invite/renew",{});
   if(!validateShare(result.share_url)||result.old_links_revoked!==true)throw Error("服务器未确认旧链接撤销，不能宣称已经更新");
   setShareUrl(result.share_url);setTeacherNotice("新链接已生成；旧邀请链接已失效，请重新通知学生");
  }catch(error){setTeacherError(error instanceof Error?error.message:"未能重新生成链接");}
  finally{setTeacherBusy(false);}
 }
 async function copyInvite(){
  if(!shareUrl)return;
  try{await navigator.clipboard.writeText(shareUrl);setTeacherNotice("作业链接已复制");}
  catch{setTeacherError("浏览器不允许自动复制，请手动选择链接文本");}
 }

 async function loadStudentTask(next:Invite){
  const request=++studentRequest.current;
  setStudentBusy(true);setStudentError("");
  try{
   const root="/tenants/"+next.tenant+"/a/"+next.token;
   const response=await read<StudentTask>(root);
   if(request!==studentRequest.current)return;
   if(!Array.isArray(response.items)||!response.items.length)throw Error("作业暂时没有可练习的句子");
   setTask(response);setItemIndex(0);setClaimed(false);setRecordBlob(null);setLatest(null);
   const saved=await read<History>("/tenants/"+next.tenant+"/assignments/"+response.assignment_id+"/my-attempts");
   if(request===studentRequest.current)setHistory(saved);
  }catch(error){if(request===studentRequest.current)setStudentError(error instanceof Error?error.message:"无法读取本人作业");}
  finally{if(request===studentRequest.current)setStudentBusy(false);}
 }
 async function checkInvite(event?:FormEvent<HTMLFormElement>){
  event?.preventDefault();if(studentBusy||recording||uploading)return;
  const value=validateShare(shareInput);
  if(!value){setStudentError("请输入老师发来的 socthink.cn 原始作业链接");setInvitation(null);setTask(null);return;}
  stopMedia();setRecordBlob(null);setTask(null);setHistory(null);setClaimed(false);setLatest(null);
  setStudentError("");setStudentNotice("");setInvitation(value);setJoinState("idle");setStudentBusy(true);
  try{
   const response=await read<{status:string}>("/tenants/"+value.tenant+"/a/"+value.token+"/join-status");
   const status=response.status==="approved"?"approved":response.status==="pending"?"pending":
    response.status==="rejected"?"rejected":"new";
   setJoinState(status);
   if(status==="approved"){setStudentBusy(false);await loadStudentTask(value);}
  }catch(error){setStudentError(error instanceof Error?error.message:"作业链接暂时不可用");}
  finally{setStudentBusy(false);}
 }
 async function joinClass(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!invitation||studentBusy)return;
  setStudentBusy(true);setStudentError("");setStudentNotice("");
  try{
   const path="/tenants/"+invitation.tenant+"/a/"+invitation.token+"/join";
   const data=await write<{status:string}>(path,{student_name:studentName.trim(),grade_label:grade});
   if(!["approved","pending"].includes(data.status))throw Error("未收到有效的入班状态");
   setJoinState(data.status as "approved"|"pending");
   if(data.status==="approved"){setStudentBusy(false);await loadStudentTask(invitation);}
   else setStudentNotice("已提交入班申请。老师批准后，点击“刷新入班状态”。");
  }catch(error){setStudentError(error instanceof Error?error.message:"入班申请失败");}
  finally{setStudentBusy(false);}
 }
 async function refreshJoin(){
  if(!invitation||studentBusy)return;
  setStudentBusy(true);setStudentError("");
  try{
   const data=await read<{status:string}>("/tenants/"+invitation.tenant+"/a/"+invitation.token+"/join-status");
   const next=data.status==="approved"?"approved":data.status==="pending"?"pending":"new";
   setJoinState(next);
   if(next==="approved"){setStudentBusy(false);await loadStudentTask(invitation);}
   else setStudentNotice(next==="pending"?"还在等待老师批准":"需要重新申请加入课堂");
  }catch(error){setStudentError(error instanceof Error?error.message:"当前无法确认入班状态");}
  finally{setStudentBusy(false);}
 }
 async function claim(){
  if(!invitation||studentBusy)return;
  setStudentBusy(true);setStudentError("");
  try{
   const result=await write<{claimed:boolean}>("/tenants/"+invitation.tenant+"/a/"+invitation.token+"/claim",{});
   if(result.claimed!==true)throw Error("领取未确认");
   setClaimed(true);setStudentNotice("作业已领取。每句录音可回听，再提交 Rust 评分。");
  }catch(error){setStudentError(error instanceof Error?error.message:"领取作业失败");}
  finally{setStudentBusy(false);}
 }
 function selectItem(index:number){
  if(!task||recording||uploading||index<0||index>=task.items.length)return;
  stopMedia();setRecordBlob(null);requestId.current="";
  setItemIndex(index);setLatest(null);setStudentError("");setStudentNotice("");
 }
 async function startRecording(){
  if(!claimed||!currentItem||recording||uploading)return;
  setStudentError("");setStudentNotice("");setRecordBlob(null);setLatest(null);requestId.current="";
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
   setStudentError("该浏览器不支持麦克风录制，请使用 Chrome、Edge 或支持录音的手机浏览器");return;
  }
  let mic:MediaStream|null=null;
  try{
   mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
   stream.current=mic;
   const mime=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(x=>MediaRecorder.isTypeSupported(x));
   if(!mime)throw Error("设备未提供课堂评分支持的 WebM/MP4 编码");
   const recorder=new MediaRecorder(mic,{mimeType:mime});
   const chunks:BlobPart[]=[];
   media.current=recorder;
   recorder.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
   recorder.onerror=()=>setStudentError("本次录音发生错误，请重新录制");
   recorder.onstop=()=>{
    if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
    stream.current?.getTracks().forEach(x=>x.stop());stream.current=null;
    media.current=null;setRecording(false);
    const blob=new Blob(chunks,{type:mime.startsWith("audio/webm")?"audio/webm":"audio/mp4"});
    if(blob.size<1024||blob.size>2*1024*1024){
     setRecordBlob(null);setStudentError("录音过短或超过课堂接口 2MB 限制，请重新录制");return;
    }
    requestId.current=crypto.randomUUID();
    setRecordBlob(blob);setStudentNotice("录音已就绪。请先回听，确认后再提交评分。");
   };
   recorder.start(250);setRecording(true);
   timer.current=setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},30000);
  }catch(error){
   mic?.getTracks().forEach(x=>x.stop());stream.current=null;media.current=null;setRecording(false);
   setStudentError(error instanceof Error?error.message:"麦克风授权失败");
  }
 }
 function finishRecording(){if(media.current?.state==="recording")media.current.stop();}
 async function submitRecording(){
  if(!recordBlob||!currentItem||!invitation||uploading||recording)return;
  if(!requestId.current){setStudentError("录音请求标识已失效，请重新录制");return;}
  setUploading(true);setStudentError("");setStudentNotice("");
  try{
   const path=API+"/tenants/"+invitation.tenant+"/a/"+invitation.token+
    "/items/"+currentItem.sentence_id+"/attempts";
   const response=await fetch(path,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"content-type":recordBlob.type,"x-request-id":requestId.current},body:recordBlob});
   const data:unknown=await response.json().catch(()=>null);
   if(!response.ok)throw Error(explain(data,response.status));
   if(!data||typeof data!=="object"||!("score" in data)||!validScore(data.score)
    ||!("attempt_id" in data)||typeof data.attempt_id!=="string"){
    throw Error("评分接口未返回可验证的成绩；保留录音供同一请求重试");
   }
   const result=data as {score:number;submitted?:boolean};
   setLatest({sentenceId:currentItem.sentence_id,score:result.score,submitted:result.submitted===true});
   setRecordBlob(null);requestId.current="";
   setStudentNotice("Rust 已保存真实评分："+displayScore(result.score)+" 分");
   if(task){
    try{
     const saved=await read<History>("/tenants/"+invitation.tenant+"/assignments/"+task.assignment_id+"/my-attempts");
     setHistory(saved);
    }catch{setStudentNotice("评分已经确认保存；历史列表刷新失败，请稍后查看。");}
   }
  }catch(error){
   setStudentError(error instanceof Error?error.message:"提交失败；录音已保留，可使用同一请求重试");
  }finally{setUploading(false);}
 }
 return <section className={styles.shell} data-testid="native-classroom-workflow">
  <div className={styles.kicker}>ACCENTLAB · NATIVE CLASSROOM</div>
  <h1>英语跟读作业</h1>
  <p className={styles.intro}>一个 SOC THINK 微信账号、一个课堂数据库。老师布置、学生领取与录音、自动评分、老师反馈，均复用已有受保护接口。</p>
  {authentication==="loading"?<p role="status">正在读取统一微信身份…</p>:null}
  {authentication==="denied"?<div className={styles.alert} role="alert">
   <strong>需要登录 SOC THINK</strong><p>{identityError}</p><Link href="/account">进入统一账户中心</Link>
  </div>:null}
  {authentication==="ready"?<>
   <div className={styles.tabs} role="group" aria-label="选择课堂身份">
    <button type="button" aria-pressed={mode==="student"} disabled={recording||uploading} onClick={()=>setMode("student")}>我是学生 · 完成作业</button>
    <button type="button" aria-pressed={mode==="teacher"} disabled={recording||uploading} onClick={()=>setMode("teacher")}>我是老师 · 布置作业</button>
   </div>
   {mode==="teacher"?<section className={styles.panel} aria-label="教师布置作业">
    {teacherAccess==="loading"?<p role="status">正在校验教师权限…</p>:null}
    {teacherAccess==="not-approved"?<p className={styles.alert}>当前微信账号没有教师授权，不能管理班级或学生成绩。管理员可在统一管理中心授予教师资格。</p>:null}
    {teacherAccess==="unavailable"?<p className={styles.alert} role="alert">教师服务暂时不可用：{teacherError}</p>:null}
    {teacherAccess==="approved"?<>
     <h2>1. 我的班级</h2>
     <div className={styles.choices} role="group" aria-label="选择教师班级">
      {classes.map(c=><button key={c.id} type="button" aria-pressed={activeClass?.id===c.id} disabled={teacherBusy}
       onClick={()=>void loadClass(c)}>{c.name}</button>)}
     </div>
     <form className={styles.inline} onSubmit={e=>void createClass(e)}>
      <label htmlFor="native-class-name">{classes.length?"新建另一个班级":"创建第一个班级"}</label>
      <input id="native-class-name" required minLength={2} maxLength={60} value={className} onChange={e=>setClassName(e.target.value)} placeholder="例如：六年级英语跟读班"/>
      <button type="submit" disabled={teacherBusy}>{teacherBusy?"请稍候…":"创建班级"}</button>
     </form>
     {activeClass?<div className={styles.group}>
      <div className={styles.titleRow}><h2>2. 布置跟读作业 · {activeClass.name}</h2>
       <button type="button" className={styles.secondary} disabled={teacherBusy} onClick={()=>void refreshClass()}>刷新班级数据</button></div>
      <form onSubmit={e=>void publishAssignment(e)}>
       <label htmlFor="native-assignment-title">作业名称</label>
       <input id="native-assignment-title" required minLength={2} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}
        placeholder="例如：周三自然科学英语跟读"/>
       <label htmlFor="native-sentence-set">选择已审核课堂素材</label>
       <select id="native-sentence-set" value={setId} onChange={e=>{setSetId(e.target.value);setSelected([])}} disabled={teacherBusy}>
        {visibleSets.length===0?<option value="">暂无已授权素材</option>:null}
        {visibleSets.map(([id,name])=><option key={id} value={id}>{name}</option>)}
       </select>
       <fieldset className={styles.sentences} disabled={teacherBusy}>
        <legend>选择要练习的句子（1–30 句）</legend>
        {visibleSentences.map(s=><label key={s.id} className={styles.sentence}>
         <input type="checkbox" checked={selected.includes(s.id)}
          onChange={e=>setSelected(x=>e.target.checked?[...x,s.id]:x.filter(id=>id!==s.id))}/>
         <span>{s.sentence}</span>
        </label>)}
       </fieldset>
       <button className={styles.primary} type="submit" disabled={teacherBusy||!setId||selected.length===0||selected.length>30}>
        发布 {selected.length} 句作业并生成分享链接
       </button>
      </form>
      {shareUrl?<div className={styles.share} aria-label="真实作业分享链接">
       <strong>分享给家长微信群</strong><input readOnly aria-label="已生成作业链接" value={shareUrl} onFocus={e=>e.target.select()}/>
       <button type="button" onClick={()=>void copyInvite()}>复制链接</button>
      </div>:null}
      <h2>3. 已布置的作业</h2>
      {assignments.length===0?<p>尚无已发布的作业。</p>:null}
      <div className={styles.records}>{assignments.map(a=><div key={a.id} className={styles.assignment}>
       <div><strong>{a.title}</strong><small>已交 {a.submitted}/{a.enrolled_total} · {a.lifecycle==="closed"?"已结束":"进行中"}</small></div>
       <button type="button" disabled={teacherBusy} onClick={()=>void showReport(a)}>查看成绩和反馈</button>
       {a.lifecycle!=="closed"?<button type="button" className={styles.secondary} disabled={teacherBusy}
        title="会撤销该作业旧的邀请链接" onClick={()=>void renewInvite(a)}>重发新链接</button>:null}
      </div>)}</div>
      <h2>4. 待审核学生</h2>
      {joins.length===0?<p>没有待审核的入班申请。</p>:null}
      {joins.map(req=><div key={req.id} className={styles.assignment}>
       <span>{req.student_name} · {req.grade_label}</span>
       <button type="button" disabled={teacherBusy} onClick={()=>void approveJoin(req)}>批准入班</button>
      </div>)}
      {report?<div className={styles.group} aria-label="教师作业报告和反馈">
       <h2>{reportTitle} · 班级结果</h2><p>已交 {report.submitted}/{report.total} 位</p>
       {report.students.map(s=><div className={styles.assignment} key={s.student_id}>
        <span>{s.name} · 录音 {s.attempts} 次 · 最佳 {displayScore(s.best_score)} · {s.submitted?"已提交":s.claimed?"练习中":"未领取"}</span>
        <button type="button" disabled={!s.claimed||teacherBusy} onClick={()=>{setFeedbackStudent(s.student_id);setFeedbackText("")}}>写反馈</button>
       </div>)}
       {feedbackStudent?<form className={styles.feedback} onSubmit={e=>void addFeedback(e)}>
        <label htmlFor="native-teacher-feedback">给这名学生的纠音反馈</label>
        <textarea id="native-teacher-feedback" minLength={1} maxLength={500} required value={feedbackText}
         onChange={e=>setFeedbackText(e.target.value)} placeholder="指出需要重练的词和建议，不要填写其他学生隐私。"/>
        <button type="submit" disabled={teacherBusy||feedbackText.trim().length===0}>保存至课堂</button>
       </form>:null}
       {report.teacher_feedback?.length?<div className={styles.feedbackList}><strong>已保存反馈</strong>
        {report.teacher_feedback.slice(0,10).map((f,i)=><p key={i}>{f.comment}</p>)}
       </div>:null}
      </div>:null}
     </div>:null}
    </>:null}
    {teacherError&&teacherAccess!=="unavailable"?<p className={styles.alert} role="alert">{teacherError}</p>:null}
    {teacherNotice?<p className={styles.success} role="status">{teacherNotice}</p>:null}
    <Link href="/english/pronunciation/next-lab/classroom">查看旧版保留的课堂历史报告</Link>
   </section>:null}
   {mode==="student"?<section className={styles.panel} aria-label="学生领取和提交作业">
    <h2>1. 找到老师的作业</h2>
    <form className={styles.stack} onSubmit={e=>void checkInvite(e)}>
     <label htmlFor="native-homework-invite">老师分享到微信群的完整作业链接</label>
     <input id="native-homework-invite" type="url" required value={shareInput} onChange={e=>setShareInput(e.target.value)}
      placeholder="https://socthink.cn/english/pronunciation/app/a/…"/>
     <button type="submit" disabled={studentBusy||recording||uploading}>验证作业链接</button>
    </form>
    {invitation&&(joinState==="new"||joinState==="rejected")?<form className={styles.stack} onSubmit={e=>void joinClass(e)}>
     <h2>2. 申请加入老师的班级</h2>
     <label htmlFor="native-student-name">学生姓名（供老师核实）</label>
     <input id="native-student-name" required minLength={1} maxLength={30} value={studentName}
      onChange={e=>setStudentName(e.target.value)}/>
     <label htmlFor="native-student-grade">年级</label>
     <select id="native-student-grade" value={grade} onChange={e=>setGrade(e.target.value)}>
      {Array.from({length:12},(_,i)=><option key={i} value={"G"+(i+1)}>G{i+1}</option>)}
     </select>
     <button type="submit" disabled={studentBusy}>提交入班申请</button>
    </form>:null}
    {invitation&&joinState==="pending"?<div className={styles.info}>
     <h2>等待老师批准</h2><p>你已经申请入班。老师确认后即可在此练习。</p>
     <button type="button" disabled={studentBusy} onClick={()=>void refreshJoin()}>刷新入班状态</button>
    </div>:null}
    {invitation&&joinState==="approved"&&task?<div className={styles.group}>
     <h2>2. {task.title}</h2>
     <p>共有 {task.items.length} 句 · {history?.attempt_count??0} 次历史评分 · {history?.submitted?"本作业已完成":"可继续练习"}</p>
     {!claimed?<button type="button" className={styles.primary} disabled={studentBusy} onClick={()=>void claim()}>领取 / 继续本作业</button>:<>
      <div className={styles.choices} role="group" aria-label="选择要跟读的作业句子">
       {task.items.map((item,index)=><button key={item.sentence_id} type="button" aria-pressed={index===itemIndex}
        disabled={recording||uploading} onClick={()=>selectItem(index)}>第 {index+1} 句</button>)}
      </div>
      {currentItem?<div className={styles.practice} aria-label="当前录音句子">
       <span className={styles.count}>第 {itemIndex+1}/{task.items.length} 句</span>
       <p className={styles.english}>{currentItem.sentence}</p>
       <p className={styles.hint}>先阅读句子，再点击麦克风开始录音。录音只会上传至本站现有课堂评分服务。</p>
       <div className={styles.actions}>
        {!recording?<button type="button" className={styles.primary} disabled={studentBusy||uploading} onClick={()=>void startRecording()}>开始录音</button>:
         <button type="button" className={styles.stop} onClick={finishRecording}>结束录音</button>}
        <span>{recording?"正在录音 · 最长 30 秒":"WebM/MP4 · 每条最多 2MB"}</span>
       </div>
       {recordUrl&&recordBlob?<div className={styles.preview}>
        <audio controls src={recordUrl} aria-label="本次录音回听"/>
        <button type="button" disabled={uploading} onClick={()=>void submitRecording()}>{uploading?"Rust 评分处理中…":"确认提交录音并评分"}</button>
       </div>:null}
       {latest?.sentenceId===currentItem.sentence_id?<p className={styles.success} role="status">
        本句真实 Rust 评分：{displayScore(latest.score)} / 100 · {latest.submitted?"作业已全部完成":"继续下一句"}
       </p>:null}
       <div className={styles.actions}>
        <button type="button" className={styles.secondary} disabled={itemIndex===0||recording||uploading}
         onClick={()=>selectItem(itemIndex-1)}>上一句</button>
        <button type="button" className={styles.secondary} disabled={itemIndex===task.items.length-1||recording||uploading}
         onClick={()=>selectItem(itemIndex+1)}>下一句</button>
       </div>
      </div>:null}
     </>}
     {history?.attempts.length?<div className={styles.group} aria-label="本人已保存成绩">
      <h3>我的真实评分记录</h3>
      <div className={styles.records}>{history.attempts.slice(0,20).map(a=><div key={a.attempt_id} className={styles.assignment}>
       <span>{new Date(a.time).toLocaleString("zh-CN")} · {displayScore(a.score)} 分</span>
       <audio controls preload="none" aria-label="本人历史录音"
        src={API+"/tenants/"+invitation.tenant+"/recordings/"+a.attempt_id}/>
      </div>)}</div>
     </div>:null}
    </div>:null}
    {studentBusy?<p role="status">正在核对真实作业记录…</p>:null}
    {studentError?<p className={styles.alert} role="alert">{studentError}</p>:null}
    {studentNotice?<p className={styles.success} role="status">{studentNotice}</p>:null}
    <Link href="/english/pronunciation/next-lab/classroom">查看本人历史成绩</Link>
   </section>:null}
  </>:null}
  <div className={styles.footer}><strong>迁移候选 · 不影响当前正式课堂</strong>
   <p>所有写操作以原课堂服务器确认的结果为准；没有实际保存就不显示成绩。旧 Vue V3 继续正常提供完整教学流程。</p>
   <Link href="/english/pronunciation/app/practice-library">返回正式 V3</Link>
  </div>
 </section>;
}
