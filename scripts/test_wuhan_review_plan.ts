import assert from "node:assert/strict";
import {buildWuhanReviewPlan} from "../src/lib/wuhan-review-plan";
import contract from "../backend/socthink-core/src/wuhan-research-report-contract.json";
import {regionByYear,regionExamHref} from "../src/lib/english-speaking-regions";
const region=regionByYear("wuhan","2027")!;
let checked=0;
for(const paper of contract.papers){
 const r={finalized:true,report_status:"research",billable:false,official_score:false,total_score:null,rubric_sha256:contract.rubricSha256,paper_id:paper.paperId,items:paper.tasks.map(t=>({task_id:t.taskId,kind:t.kind,state:"not_submitted",candidate:null as unknown}))};
 const plan=buildWuhanReviewPlan(r,contract.rubricSha256,paper.tasks);assert.equal(plan.length,18);
 const set=region.papers.find(p=>p.set===paper.paperId)!;
 for(const t of plan){
   const u=new URL(regionExamHref(region,set,"practice",t.id),"https://example.invalid");
   assert.equal(u.searchParams.get("set"),paper.paperId);assert.equal(u.searchParams.get("focus"),paper.tasks[t.number-1]!.taskId);assert.equal(u.searchParams.get("mode"),"practice");checked++;
 }
 r.items[8]!.state="known_mismatch";r.items[9]!.state="unanswered";r.items[0]!.state="correct";
 const sorted=buildWuhanReviewPlan(r,contract.rubricSha256,paper.tasks);
 assert.equal(sorted[0]!.number,9);assert.equal(sorted[1]!.number,10);assert.ok(!sorted.some(t=>t.number===1));
 for(const bad of [{...r,finalized:false},{...r,rubric_sha256:"old"},{...r,billable:true},{...r,items:r.items.slice(1)},{...r,items:[{...r.items[0],task_id:"injected"},...r.items.slice(1)]}])assert.deepEqual(buildWuhanReviewPlan(bad,contract.rubricSha256,paper.tasks),[]);
}
assert.equal(checked,180);
console.log("R84_REVIEW_PLAN_PASS 180 exact original-task links; priority; stale/unfinalized/invalid report rejected");
