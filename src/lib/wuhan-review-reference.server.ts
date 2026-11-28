import "server-only";
import bank from "./wuhan-review-reference.json";

export function reviewReference(report:Record<string,unknown>,task:Record<string,unknown>){
 // Server-rendered owner-authorized finalized reports only. No public answer
 // API, no bank for live attempts, and no reinterpretation after a revision.
 if(report.finalized!==true||report.report_status!=="research"||report.official_score!==false||report.rubric_sha256!==bank.rubricSha256)return null;
 if(!["answer","read","retell"].includes(String(task.kind)))return null;
 return bank.records.find(r=>r.paperId===report.paper_id&&r.taskId===task.task_id&&r.kind===task.kind)||null;
}
