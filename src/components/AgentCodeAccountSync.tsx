"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import type {CodeCheck} from "@/lib/code-lab-engine";
import styles from "./AgentCodeAccountSync.module.css";

type Attempt={attemptId:string;taskId:string;passed:number;total:number;correct:boolean;submittedAt:number};
const ENDPOINT="/api/skill-labs/engineering/agent/attempts";

/** Optional and explicit: browser testing stays local until learner chooses to upload. */
export default function AgentCodeAccountSync({
 taskId,source,feedback,
}:{taskId:string;source:string;feedback:CodeCheck|null}){
 const [status,setStatus]=useState<"loading"|"ready"|"guest"|"unavailable">("loading");
 const [attempts,setAttempts]=useState<Attempt[]>([]);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const attemptId=useRef("");
 const savedCount=new Set(attempts.filter(x=>x.correct).map(x=>x.taskId)).size;

 async function loadHistory(){
  try{
   const r=await fetch(ENDPOINT,{cache:"no-store",credentials:"same-origin"});
   if(r.status===401){setStatus("guest");return;}
   if(!r.ok)throw Error("HISTORY_UNAVAILABLE");
   const json=await r.json() as {attempts?:Attempt[]};
   if(!Array.isArray(json.attempts))throw Error("BAD_HISTORY");
   setAttempts(json.attempts);setStatus("ready");
  }catch{setStatus("unavailable");}
 }
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const r=await fetch(ENDPOINT,{cache:"no-store",credentials:"same-origin"});
    if(!active)return;
    if(r.status===401){setStatus("guest");return;}
    if(!r.ok)throw Error("HISTORY_UNAVAILABLE");
    const json=await r.json() as {attempts?:Attempt[]};
    if(!active)return;
    if(!Array.isArray(json.attempts))throw Error("BAD_HISTORY");
    setAttempts(json.attempts);setStatus("ready");
   }catch{if(active)setStatus("unavailable");}
  })();
  return ()=>{active=false;};
 },[]);

 async function save(){
  if(status!=="ready"||!feedback||feedback.taskId!==taskId||saving)return;
  setSaving(true);setMessage("");
  if(!attemptId.current)attemptId.current=crypto.randomUUID();
  try{
   const response=await fetch(ENDPOINT,{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({taskId,source,attemptId:attemptId.current}),
   });
   const body=await response.json() as {summary?:Attempt;code?:string;message?:string};
   if(!response.ok){
    if(response.status===401){setStatus("guest");throw Error("微信登录已过期，请重新登录。");}
    throw Error(body.message??(response.status===429?"提交过于频繁，请稍后再试。":"服务器复测未完成："+(body.code??response.status)));
   }
   if(!body.summary)throw Error("服务器未确认保存；本地结果仍可使用。");
   setMessage("服务器独立复测："+body.summary.passed+"/"+body.summary.total+"组，已写入微信学习记录。");
   await loadHistory();
  }catch(error){setMessage(error instanceof Error?error.message:"连接失败，未确认保存。");}
  finally{setSaving(false);}
 }
 return <div className={styles.box} aria-label="微信账号 Agent 代码作业记录">
  <div className={styles.heading}>
   <strong>微信账号学习记录</strong>
   {status==="ready"&&<span>服务器累计通过 {savedCount}/4 项</span>}
  </div>
  {status==="loading"&&<p>检查是否已有微信学习记录…</p>}
  {status==="guest"&&<p>代码在浏览器免费运行。<Link href="/login?next=%2Fskill-labs%2Fengineering%2Fagent">微信登录</Link>后，可以主动提交服务器复测，获得跨设备训练记录。</p>}
  {status==="unavailable"&&<p>学习记录暂不可用，继续本地编程不受影响。</p>}
  {status==="ready"&&<>
   <p>目前本机运行结果为 {feedback?feedback.passed+"/"+feedback.total+" 组通过":"未运行"}。保存时服务器会重新执行代码，不接受网页自报分数。</p>
   {feedback&&<button type="button" onClick={()=>void save()} disabled={saving}>
    {saving?"服务器复测中…":"主动提交并保存本次代码作业"}
   </button>}
   {message&&<p role="status" className={styles.result}>{message}</p>}
  </>}
  <p className={styles.note}>仅主动提交时源码才离开浏览器；服务器不存源码，只保存测试结果和代码 SHA-256 指纹。账号记录用于学习复盘，不是职业资格或招聘成绩。</p>
 </div>;
}
