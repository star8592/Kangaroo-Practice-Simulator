"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import type {CareerPracticeGrade} from "@/lib/career-practice-grade";
import type {CareerAttemptSummary} from "@/lib/career-attempt-store";
import styles from "@/app/career/practice/career-practice.module.css";

type HistoryStatus="loading"|"signed-out"|"ready"|"error";
type Props={caseId:string;revision:number;refreshKey:number;onOpen:(grade:CareerPracticeGrade)=>void};

/** A compact adjunct to the existing exercise, not a second account/profile
 * system. The server derives ownership from the verified WeChat session.
 */
export default function CareerPracticeHistory({caseId,revision,refreshKey,onOpen}:Props){
  const [state,setState]=useState<HistoryStatus>("loading");
  const [records,setRecords]=useState<CareerAttemptSummary[]>([]);
  const [opening,setOpening]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    let active=true;
    async function load(){
      try{
        const response=await fetch("/api/career/practice/history?caseId="+encodeURIComponent(caseId),
          {cache:"no-store"});
        if(!active)return;
        if(response.status===401){setState("signed-out");return;}
        if(!response.ok)throw Error("读取失败");
        const data=await response.json() as {attempts?:CareerAttemptSummary[]};
        if(!active)return;
        setRecords(Array.isArray(data.attempts)?data.attempts:[]);
        setState("ready");
      }catch{
        if(active)setState("error");
      }
    }
    void load();
    return ()=>{active=false;};
  },[caseId,refreshKey]);

  async function openAttempt(attemptId:string){
    if(opening)return;
    setOpening(attemptId);setMessage("");
    try{
      const response=await fetch(
        "/api/career/practice/history?attemptId="+encodeURIComponent(attemptId),
        {cache:"no-store"});
      if(!response.ok)throw Error("历史报告暂时无法打开");
      const data=await response.json() as {summary?:CareerAttemptSummary;grade?:CareerPracticeGrade};
      if(!data.summary||!data.grade||data.summary.caseId!==caseId||
        data.summary.revision!==revision||data.grade.caseId!==caseId)
        throw Error("这份历史记录属于其他版本，请到对应案例查看");
      onOpen(data.grade);
    }catch(e){setMessage(e instanceof Error?e.message:"读取失败，请重试");}
    finally{setOpening(null);}
  }
  const loginUrl="/login?next="+encodeURIComponent("/career/practice/"+caseId);

  if(state==="loading")return <div className={styles.historyBar} aria-live="polite">
    <span>正在查询我的训练记录…</span>
  </div>;
  if(state==="signed-out")return <div className={styles.historyBar}>
    <span>免费作答，无需登录。微信登录后，下一次交卷可自动保存，并跨设备查看历史成绩。</span>
    <Link href={loginUrl}>微信登录</Link>
  </div>;
  if(state==="error")return <div className={styles.historyBar}>
    <span>暂时无法查询成绩历史，当前练习和评分不受影响。</span>
  </div>;
  return <div className={styles.historyBar}>
    <details className={styles.historyDetails}>
      <summary>我的微信账号练习记录（{records.length} 次）</summary>
      {records.length===0?<p>这套案例还没有已保存的成绩。提交后自动保存到当前微信账号。</p>:
        <ul className={styles.historyList}>
          {records.map((record,i)=><li key={record.attemptId}>
            <span>{i+1}. {new Date(record.submittedAt).toLocaleString("zh-CN")} ·
              <strong> {record.score}/{record.maxPoints} 分</strong></span>
            <button type="button" disabled={opening!==null}
              onClick={()=>void openAttempt(record.attemptId)}>
              {opening===record.attemptId?"打开中…":"查看完整报告"}
            </button>
          </li>)}
        </ul>}
      <p>成绩归当前已验证微信账号所有，不对其他账号公开；免费练习不等于企业官方测评或正式职业资格。</p>
      {message&&<p role="alert">{message}</p>}
    </details>
  </div>;
}
