import assert from "node:assert/strict";
import {ASSESSMENT_DOMAINS} from "../src/lib/assessment-platform";
import {EXAM_DIRECTORY,validateExamDirectory} from "../src/lib/exam-directory";

assert.deepEqual(validateExamDirectory(),[],"All topics and routes must be consistent");
assert.equal(EXAM_DIRECTORY.length,ASSESSMENT_DOMAINS.length,"Every platform domain is represented");
const topics=EXAM_DIRECTORY.flatMap(g=>g.topics);
assert.ok(topics.length>=50,"Large platform directory must not shrink into a math-only navigation");
assert.ok(topics.some(t=>t.title.zh.includes("小升初")),"K12 should include the Chinese school transition");
assert.ok(topics.some(t=>t.title.zh.includes("法律职业资格")),"Professional exams must be represented");
assert.ok(topics.some(t=>t.title.zh.includes("SQL")),"Practical job assessments must be represented");
assert.ok(topics.some(t=>t.title.zh.includes("雅思")),"Language exams must be represented");
assert.ok(topics.some(t=>t.title.zh.includes("考研")),"Postgraduate examinations must be represented");
assert.ok(topics.some(t=>t.title.zh.includes("职业兴趣")),"Interest and aptitude must be represented");
assert.ok(topics.some(t=>t.id==="kangaroo" && t.href==="/competitions"),"Existing training remains reachable");
assert.ok(topics.some(t=>t.id==="math-g1-g12" && t.href==="/arithmetic"),"Actual maths stays live");
assert.ok(topics.every(t=>t.status==="planned"?!t.href:!!t.href),"No fake active links");
for(const g of EXAM_DIRECTORY){
  const d=ASSESSMENT_DOMAINS.find(x=>x.id===g.domainId);
  assert.ok(d);
  if(d!.readiness==="planned") assert.ok(g.topics.every(t=>!t.href),
    "Future domains must not expose fictional exams");
}
console.log("EXAM_DIRECTORY=PASS (seven categories, topic coverage, genuine live links, no false openings)");
