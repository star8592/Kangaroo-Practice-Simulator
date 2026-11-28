import "server-only";
import bank from "./wuhan-review-reference.json";

export function reviewReference(report:Record<string,unknown>,task:Record<string,unknown>){
 // Server-rendered owner-authorized finalized reports only. No public answer
 // API, no bank for live attempts, and no reinterpretation after a revision.
 if(report.finalized!==true||report.report_status!=="research"||report.official_score!==false||report.rubric_sha256!==bank.rubricSha256)return null;
 if(!["answer","read","retell"].includes(String(task.kind)))return null;
 return bank.records.find(r=>r.paperId===report.paper_id&&r.taskId===task.task_id&&r.kind===task.kind)||null;
}

export function retellChecklist(report:Record<string,unknown>,task:Record<string,unknown>){
 if(!reviewReference(report,task)||task.kind!=="retell"||!["partial_reference","reference_match"].includes(String(task.state)))return null;
 const c=task.candidate as Record<string,unknown>|null,e=c?.retell_coverage as Record<string,unknown>|null;
 const g=bank.retellGroups.find(g=>g.paperId===report.paper_id&&g.taskId===task.task_id);
 if(!g||!e||typeof c?.machine_rule_revision!=="string"||!/^[a-f0-9]{64}$/.test(c.machine_rule_revision)||report.machine_rule_revision!==c.machine_rule_revision||e.bank_sha256!==bank.retellBankSha256||e.schema_version!==1||e.basis!=="independent_bounded_fact_groups"||e.total_groups!==g.groups.length||!Array.isArray(e.confirmed_indices)||!e.confirmed_indices.length||Object.keys(e).length!==5)return null;
 const indices=e.confirmed_indices;
 if(indices.some((x,i)=>!Number.isInteger(x)||x<0||x>=g.groups.length||(i>0&&x<=indices[i-1])))return null;
 return {confirmed:indices.length,total:g.groups.length,rows:g.groups.map((text,i)=>({text,confirmed:indices.includes(i)}))};
}
