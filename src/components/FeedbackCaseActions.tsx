"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus } from "@/lib/customer-feedback-workflow";
import styles from "./FeedbackCaseActions.module.css";
const nextStatus:Record<CaseStatus,CaseStatus[]> = {open:["investigating"],investigating:["resolved","dismissed"],resolved:["verified","investigating"],verified:["closed","investigating"],closed:["investigating"],dismissed:["investigating"]};
const labels:Record<CaseStatus,string> = {
  open:"待核查", investigating:"核查中",resolved:"已修复／有结论",
  verified:"已复测",closed:"已归档",dismissed:"已驳回",
};
export default function FeedbackCaseActions({
  feedbackId,version,status,
}:{feedbackId:string;version:number;status:CaseStatus}) {
  const router=useRouter();
  const possible=nextStatus[status];
  const [to,setTo]=useState<CaseStatus>(possible[0]||status);
  const [note,setNote]=useState("");
  const [evidenceRef,setEvidenceRef]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  async function save(){
    if(saving) return;
    setSaving(true);setError("");
    try{
      const response=await fetch("/api/admin/feedback-cases",{
        method:"PATCH",credentials:"same-origin",headers:{"content-type":"application/json"},
        body:JSON.stringify({feedbackId,expectedVersion:version,to,note,evidenceRef}),
      });
      const body=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok || !body.ok) throw new Error(body.error||"保存失败");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"保存失败")}
    finally{setSaving(false)}
  }
  return <div className={styles.container}>
    <strong className={styles.status}>{labels[status]}</strong>
    <div className={styles.form}>
      <select aria-label={"处理"+feedbackId} value={to} onChange={e=>setTo(e.target.value as CaseStatus)}>
        {possible.map(x=><option key={x} value={x}>{labels[x]}</option>)}
      </select>
      <textarea aria-label={"核查说明"+feedbackId} maxLength={500} rows={2}
        placeholder="记录核查依据、结果或复测结论（至少8字）"
        value={note} onChange={e=>setNote(e.target.value)}/>
      <input aria-label={"证据引用"+feedbackId} maxLength={240} value={evidenceRef}
        placeholder="证据：GitHub提交/试卷版本/测试报告"
        onChange={e=>setEvidenceRef(e.target.value)}/>
      <button type="button" disabled={saving || !possible.length || note.trim().length<8 ||
        (["resolved","verified","closed","dismissed"].includes(to)&&!evidenceRef.trim())}
        onClick={save}>{saving?"保存中…":"记录处理"}</button>
      {error&&<small role="alert" className={styles.error}>{error}</small>}
    </div>
  </div>;
}
