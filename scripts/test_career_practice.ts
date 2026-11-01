import assert from "node:assert/strict";
import fs from "node:fs";
import {NextRequest} from "next/server";
import {POST} from "../src/app/api/career/practice/[id]/grade/route";
import {getCareerPractice,CAREER_PRACTICE_CASES} from "../src/lib/career-practice";
import {gradeCareerPractice,buildCareerAssessmentContract,validateCareerPracticeRubrics}
  from "../src/lib/career-practice-grade";
import {listCareerDemandFamilies} from "../src/lib/career-demand";

const CASE="supplier-selection-001";
const practice=getCareerPractice(CASE);
assert(practice,"one original case must be delivered");
assert.equal(CAREER_PRACTICE_CASES.length,3);
assert.deepEqual(validateCareerPracticeRubrics(),[]);
assert.equal(practice.domain,"career");
assert.equal(practice.family,"procurement");
assert.equal(practice.sourceRights,"original");
assert.equal(practice.deliveryState,"free-live-preview");
assert.equal(practice.maxPoints,100);
assert.equal(practice.questions.length,6);
assert.equal(practice.questions.reduce((sum,q)=>sum+q.weight,0),100);
assert.deepEqual([...new Set(practice.questions.map(x=>x.id))].length,6);
const evidence=listCareerDemandFamilies().flatMap(x=>x.signals)
  .find(x=>x.id===practice.evidenceSignalId);
assert(evidence&&evidence.evidenceLevel==="job");
assert(evidence.skills.includes("supplier_selection"));
assert(practice.evidenceSkillCodes.every(skill=>evidence.skills.includes(skill)));
const contract=buildCareerAssessmentContract(CASE);
assert(contract?.valid);
assert.equal(contract.blueprint.gradingMode,"deterministic");
assert.equal(contract.blueprint.domain,"career");
assert.equal(contract.blueprint.itemRefs.length,6);
assert(contract.items.every(x=>x.source.rights==="original"&&
  x.source.originalHash.length===64));

const correct={
  eligibility:["A","C"],quantity:"657","landed-cost":"34821",
  "supplier-choice":"C",savings:"71",contingency:"none",
};
const full=gradeCareerPractice(CASE,correct);
assert(full);
assert.equal(full.score,100);
assert.equal(full.maxPoints,100);
assert.equal(full.completed,6);
assert(full.items.every(x=>x.correct));
assert.equal(full.items.reduce((sum,x)=>sum+x.earned,0),100);
const reverse=gradeCareerPractice(CASE,{...correct,eligibility:["C","A"]});
assert.equal(reverse?.score,100,"multi selection order must not affect grading");
const blank=gradeCareerPractice(CASE,{});
assert.equal(blank?.score,0,"blank answers never earn a reward");
assert.equal(blank?.completed,0);
assert.equal(blank?.items.length,6);
const incorrect=gradeCareerPractice(CASE,{
  eligibility:["B"],quantity:"650","landed-cost":"34000",
  "supplier-choice":"A",savings:"0",contingency:"C",
});
assert.equal(incorrect?.score,0,"wrong answers must not earn points");
assert.equal(incorrect?.completed,6);
assert(incorrect?.advice.length===6);
const partial=gradeCareerPractice(CASE,{eligibility:["A","C"],quantity:"657"});
assert.equal(partial?.score,30);
assert.equal(partial?.completed,2);
assert.throws(()=>gradeCareerPractice(CASE,{surprise:"C"}),/UNKNOWN_QUESTION/);
assert.throws(()=>gradeCareerPractice(CASE,{eligibility:["X"]}),/MULTIPLE_CHOICE_INVALID/);
assert.throws(()=>gradeCareerPractice(CASE,{quantity:"a".repeat(500)}),/ANSWER_INVALID/);
assert.equal(gradeCareerPractice("unknown-case",{}),null);

const extraCases=[
  {
    id:"campaign-performance-001",
    evidence:"meituan-ops",
    answers:{eligible:["search","community"],"net-revenue":"33120",
      contribution:"12100","best-roi":"community","largest-contribution":"21120",
      "roi-threshold":"community"},
    wrong:{eligible:["video"],"net-revenue":"0",contribution:"1",
      "best-roi":"video","largest-contribution":"0","roi-threshold":"none"}
  },
  {
    id:"manufacturing-quality-001",
    evidence:"schneider-quality",
    answers:{"temperature-rpn":"240","largest-rpn":"temperature",
      "high-rpn":["connector","temperature"],"improved-rpn":"120",
      "rpn-reduction":"120","professional-judgement":"review-severity"},
    wrong:{"temperature-rpn":"216","largest-rpn":"scratch",
      "high-rpn":["scratch"],"improved-rpn":"240",
      "rpn-reduction":"0","professional-judgement":"rpn-only"},
  }
];
for(const c of extraCases){
  const exercise=getCareerPractice(c.id);
  assert(exercise&&exercise.evidenceSignalId===c.evidence);
  assert(exercise.dataTable?.headers.length===exercise.dataTable?.rows[0].length);
  assert(exercise.dataTable.rows.every(r=>r.length===exercise.dataTable?.headers.length));
  assert.equal(exercise.questions.length,6);
  assert.equal(exercise.questions.reduce((n,q)=>n+q.weight,0),100);
  assert(buildCareerAssessmentContract(c.id)?.valid);
  const success=gradeCareerPractice(c.id,c.answers);
  assert.equal(success?.score,100,c.id+" full correct");
  assert.equal(success?.completed,6,c.id+" all answered");
  assert.equal(gradeCareerPractice(c.id,{})?.score,0,c.id+" blank");
  assert.equal(gradeCareerPractice(c.id,c.wrong)?.score,0,c.id+" wrong");
  assert(gradeCareerPractice(c.id,c.wrong)?.advice.length===6);
  const ref=listCareerDemandFamilies().flatMap(f=>f.signals).find(x=>x.id===c.evidence);
  assert(ref&&ref.evidenceLevel==="job");
  assert(exercise.evidenceSkillCodes.every(skill=>ref.skills.includes(skill)));
}

const publicFile=fs.readFileSync("src/lib/career-practice.ts","utf8");
assert(!publicFile.includes('"34821"'),"do not publish grading key with public challenge");
assert(!publicFile.includes('"657"'),"do not publish grading key with public challenge");
const nextPage=fs.readFileSync("src/app/career/page.tsx","utf8");
assert(nextPage.includes("available=candidates.filter"));
assert(nextPage.includes("href={x.liveHref!}"));

async function request(id:string,answers:unknown,headers?:Record<string,string>){
  return POST(new NextRequest("http://localhost/api/career/practice/"+id+"/grade",{
    method:"POST",headers:{"content-type":"application/json",...headers},
    body:JSON.stringify({answers}),
  }),{params:Promise.resolve({id})});
}
async function verifyApi(){
  const ok=await request(CASE,correct);
  assert.equal(ok.status,200);
  assert.equal(ok.headers.get("cache-control"),"private, no-store");
  assert.equal((await ok.json()).grade.score,100);
  const noAnswers=await request(CASE,{});
  assert.equal(noAnswers.status,200);
  assert.equal((await noAnswers.json()).grade.score,0);
  const invalid=await request(CASE,{unknown:"C"});
  assert.equal(invalid.status,400);
  const missing=await request("not-real",{});
  assert.equal(missing.status,404);
  const wrongMime=await request(CASE,{},{"content-type":"text/plain"});
  assert.equal(wrongMime.status,415);
  for(const c of extraCases){
    const response=await request(c.id,c.answers);
    assert.equal(response.status,200);
    assert.equal((await response.json()).grade.score,100);
  }
  const oversized=await request(CASE,{quantity:"x".repeat(9000)});
  assert.equal(oversized.status,413);
  console.log("CAREER_PRACTICE_E2E_CONTRACT=PASS cases=3 each_questions=6 max=100 grade_api=PASS");
}
verifyApi().catch(e=>{console.error(e);process.exitCode=1;});
