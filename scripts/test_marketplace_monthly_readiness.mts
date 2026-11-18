import assert from "node:assert/strict";
import type {ExamBundle} from "../src/lib/types";
import {AMC8_MONTHLY_MIN_PAPERS,AMC8_MONTHLY_TERM_DAYS,
  checkMonthlyExamInventory,checkMonthlyExamPermission,type MonthlyPaper
} from "../src/lib/marketplace-monthly-readiness";
const ids=["amc8-original-alpha","amc8-original-beta","amc8-original-gamma","amc8-original-delta"];
const paper=(examId:string,index:number):ExamBundle=>({
  profile:{id:examId,formatId:"maa-amc8",questionCount:25,durationSeconds:2400,
    rightsPolicy:{rightsClass:"original-verified",license:"synthetic-qa-original-only",
      commercialUse:true,publicQuestionDisplay:true}},
  questions:Array.from({length:25},(_,i)=>({
    id:examId+"-q"+(i+1),questionNo:i+1,stem:"Original mock "+index+" problem "+(i+1),
    answer:"A",choices:[{key:"A",label:"1"},{key:"B",label:"2"}],
  })),
} as unknown as ExamBundle);
const entries:MonthlyPaper[]=ids.map(examId=>({examId,rightsApproved:true,deliveryVerified:true}));
const get=(id:string)=>paper(id,ids.indexOf(id));
const qaInventory=(p:MonthlyPaper[],load:(id:string)=>ExamBundle,assets:()=>boolean)=>
  checkMonthlyExamInventory(p,load,assets,()=>true);
let count=0;
function check(name:string,fn:()=>void){fn();count++;process.stdout.write("PASS "+name+"\n")}
check("4 different papers minimum",()=>assert.equal(AMC8_MONTHLY_MIN_PAPERS,4));
check("30 days exact",()=>assert.equal(AMC8_MONTHLY_TERM_DAYS,30));
check("metadata alone cannot activate unsigned commercial rights",()=>assert.equal(
  checkMonthlyExamInventory(entries,get,()=>true).code,"RIGHTS_UNAPPROVED"));
check("only one paper is not a saleable month",()=>assert.equal(qaInventory(entries.slice(0,1),get,()=>true).code,"PAPERS_MISSING"));
check("4 synthetic original papers pass policy",()=>{const r=qaInventory(entries,get,()=>true);assert.equal(r.ready,true);assert.deepEqual(r.examIds,ids)});
check("duplicate paper id denied",()=>assert.equal(qaInventory([...entries.slice(0,3),entries[0]],get,()=>true).code,"DUPLICATE_PAPER"));
check("unapproved content rights denied",()=>assert.equal(qaInventory(entries.map((p,i)=>i===2?{...p,rightsApproved:false}:p),get,()=>true).code,"RIGHTS_UNAPPROVED"));
check("historic noncommercial rights cannot be laundered by manifest",()=>{
 const bad=(id:string)=>{const b=get(id);b.profile.rightsPolicy={rightsClass:"educational-share",
   license:null,commercialUse:false};return b};
 assert.equal(qaInventory(entries,bad,()=>true).code,"RIGHTS_UNAPPROVED");
});
check("delivery unverified denied",()=>assert.equal(qaInventory(entries.map((p,i)=>i===1?{...p,deliveryVerified:false}:p),get,()=>true).code,"RIGHTS_UNAPPROVED"));
check("missing source bundle denied",()=>assert.equal(qaInventory(entries,()=>{throw Error("missing")},()=>true).code,"EXAM_INVALID"));
check("copied content with different IDs denied",()=>{
 const copy=(id:string)=>{const b=get(id);b.questions.forEach((q,i)=>{q.stem="same q "+i});return b};
 assert.equal(qaInventory(entries,copy,()=>true).code,"DUPLICATE_CONTENT");
});
check("wrong duration denied",()=>{
 const bad=(id:string)=>{const b=get(id);b.profile.durationSeconds=1800;return b};
 assert.equal(qaInventory(entries,bad,()=>true).code,"EXAM_INVALID");
});
check("image verification failure denied",()=>assert.equal(qaInventory(entries,get,()=>false).code,"QUESTION_IMAGES_MISSING"));
const now=Date.now();const grant={createdAt:now,expiresAt:now+30*86400_000,examIds:ids};
check("eligible first paper allowed",()=>assert.equal(checkMonthlyExamPermission(grant,ids[0],[],now).allowed,true));
check("repeated submitted paper denied",()=>assert.equal(checkMonthlyExamPermission(grant,ids[0],[ids[0]],now).reason,"EXAM_ALREADY_USED"));
check("paper outside plan denied",()=>assert.equal(checkMonthlyExamPermission(grant,"amc8-unknown",[],now).reason,"EXAM_NOT_IN_PLAN"));
check("first millisecond after expiry denied",()=>assert.equal(checkMonthlyExamPermission(grant,ids[0],[],grant.expiresAt).reason,"MONTHLY_EXPIRED"));
check("future dated grant denied",()=>assert.equal(checkMonthlyExamPermission(grant,ids[0],[],now-1).reason,"MONTHLY_EXPIRED"));
check("revocation wins",()=>assert.equal(checkMonthlyExamPermission({...grant,revokedAt:now},ids[0],[],now).reason,"MONTHLY_REVOKED"));
check("fake 31-day entitlement denied",()=>assert.equal(checkMonthlyExamPermission({...grant,expiresAt:grant.expiresAt+86400_000},ids[0],[],now).reason,"MONTHLY_GRANT_INVALID"));
console.log("AMC8_MONTHLY_POLICY="+count+"/"+count+" PASS - draft policy only");
