// Pure selector shared by server-only review module and its offline tests.
// Input is a frozen authorized report and a minimal current task manifest.
type Obj=Record<string,unknown>;
const obj=(x:unknown):Obj=>x!==null&&typeof x==="object"&&!Array.isArray(x)?x as Obj:{};
export type ReviewTask={taskId:string;kind:string};
export type ReviewPlanItem={id:string;number:number;kind:string;reason:string;priority:number};
export function buildWuhanReviewPlan(report:unknown,expectedRevision:string,tasks:readonly ReviewTask[]):ReviewPlanItem[]{
 const r=obj(report);
 if(r.finalized!==true||r.report_status!=="research"||r.billable!==false||r.official_score!==false||r.total_score!==null||r.rubric_sha256!==expectedRevision||typeof r.paper_id!=="string"||!/^WH(0[1-9]|10)$/.test(r.paper_id)||!Array.isArray(r.items)||r.items.length!==18||tasks.length!==18)return [];
 if(tasks.some((t,i)=>{const x=obj((r.items as unknown[])[i]);return x.task_id!==t.taskId||x.kind!==t.kind||!/^[a-z0-9-]{1,80}$/.test(t.taskId)}))return [];
 const out:ReviewPlanItem[]=[];
 for(const [i,t] of tasks.entries()){
  const item=obj(r.items[i]),c=obj(item.candidate),d=obj(c.diagnosis),state=item.state;
  let reason="",priority=0;
  if(t.kind==="choice"&&state==="incorrect"){reason="听错关键信息";priority=0}
  else if(t.kind==="answer"&&state==="known_mismatch"){reason="关键信息回答错误";priority=0}
  else if(state==="unanswered"){reason="无有效答音";priority=1}
  else if(t.kind==="retell"&&state==="partial_reference"){reason="补全转述信息";priority=2}
  else if(t.kind==="read"&&state==="reference_text_differs"){reason="练习完整朗读";priority=2}
  else if(t.kind==="read"&&state==="reference_text_matched"&&typeof d.fluency_evidence==="object"&&Number(obj(d.fluency_evidence).longest_internal_pause_ms)>=2000){reason="练习连贯朗读";priority=2}
  else if(state==="needs_review"||state==="asr_disagreement"){reason="重新清楚作答";priority=3}
  else if(state==="not_submitted"&&item.candidate===null){reason="补做未完成题目";priority=4}
  if(reason)out.push({id:t.taskId,number:i+1,kind:t.kind,reason,priority});
 }
 return out.sort((a,b)=>a.priority-b.priority||a.number-b.number);
}
