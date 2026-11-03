import assert from "node:assert/strict";
import {ASSESSMENT_DOMAINS} from "../src/lib/assessment-platform";
import {EXAM_DIRECTORY,EXAM_DOMAIN_IDS,validateExamDirectory} from "../src/lib/exam-directory";

assert.deepEqual(validateExamDirectory(),[],"All topics and routes must be consistent");
assert.equal(EXAM_DIRECTORY.length,5,"Only actual exams belong in the exam directory");
assert.deepEqual(EXAM_DIRECTORY.map(g=>g.domainId),[...EXAM_DOMAIN_IDS]);
assert.ok(!EXAM_DIRECTORY.some(g=>g.domainId==="career"||g.domainId==="interest"));
assert.equal(ASSESSMENT_DOMAINS.length,7,"API catalog remains unchanged");
const topics=EXAM_DIRECTORY.flatMap(g=>g.topics);
assert.ok(topics.length>=35,"Retain genuine exam breadth");
assert.ok(topics.some(t=>t.title.zh.includes("小升初")),"K12 should include the Chinese school transition");
assert.ok(topics.some(t=>t.title.zh.includes("法律职业资格")),"Professional exams must be represented");
assert.ok(!topics.some(t=>t.title.zh.includes("SQL")),"SQL belongs to skill training");
assert.ok(topics.some(t=>t.title.zh.includes("雅思")),"Language exams must be represented");
assert.ok(topics.some(t=>t.title.zh.includes("考研")),"Postgraduate examinations must be represented");
assert.ok(!topics.some(t=>t.title.zh.includes("职业兴趣")),"Career interest belongs to assessment center");
assert.ok(topics.some(t=>t.id==="kangaroo" && t.href==="/competitions"),"Existing training remains reachable");
assert.ok(topics.some(t=>t.id==="math-g1-g12" && t.href==="/arithmetic"),"Actual maths stays live");
assert.ok(topics.every(t=>t.status==="planned"?!t.href:!!t.href),"No fake active links");
for(const g of EXAM_DIRECTORY){
  const d=ASSESSMENT_DOMAINS.find(x=>x.id===g.domainId);
  assert.ok(d);
  if(d!.readiness==="planned") assert.ok(g.topics.every(t=>!t.href),
    "Future domains must not expose fictional exams");
}
console.log("EXAM_DIRECTORY=PASS (five exam categories, genuine routes, business boundaries)");
