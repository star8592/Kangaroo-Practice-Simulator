import assert from "node:assert/strict";
import fs from "node:fs";
import {READING_PASSAGES,READING_QUESTIONS,READING_SKILLS,scoreReading,validateReadingBank} from "../src/lib/reading-practice";
import {ASSESSMENT_EVIDENCE,validateEvidenceRegistry} from "../src/lib/assessment-evidence";
import {CENTER_SECTIONS} from "../src/lib/measurement-center";
assert.deepEqual(validateReadingBank(),[]);
assert.deepEqual(validateEvidenceRegistry(),[]);
assert.equal(READING_PASSAGES.length,4);
assert.equal(READING_QUESTIONS.length,16);
assert.equal(READING_SKILLS.length,4);
assert.equal(ASSESSMENT_EVIDENCE.length,4);
assert.equal(CENTER_SECTIONS.filter(s=>"route" in s||"instrumentId" in s).length,5);
for(const q of READING_QUESTIONS){
 const source=READING_PASSAGES.find(p=>p.id===q.passageId);
 assert(source?.text.includes(q.evidence),q.id+" quote is present verbatim");
 assert(q.options[q.answer],q.id+" correct answer in options");
}
const perfect=Object.fromEntries(READING_QUESTIONS.map(q=>[q.id,q.answer]));
const all=scoreReading(perfect)!;
assert.equal(all.correct,16);
assert.equal(all.nextPractice.length,0);
assert(all.skills.every(s=>s.correct===4&&s.total===4));
assert.equal(scoreReading({}),null,"never fabricate missing answers");
const partial={...perfect};delete partial["lr-08"];
assert.equal(scoreReading(partial),null,"incomplete attempt is not scored");
const first=READING_QUESTIONS[0];
const incorrect={...perfect,[first.id]:(first.answer+1)%4};
const report=scoreReading(incorrect)!;
assert.equal(report.correct,15);
assert.equal(report.items.filter(i=>!i.correct).length,1);
assert.equal(report.skills.find(s=>s.id===first.skill)?.correct,3);
assert.equal(report.nextPractice.length,1);
assert.throws(()=>scoreReading({...perfect,["lr-01"]:4}),/INVALID_READING_ANSWER/);
assert.throws(()=>scoreReading({...perfect,extra:0}),/INVALID_READING_ANSWER/);
assert.throws(()=>scoreReading({...perfect,["lr-01"]:-1}),/INVALID_READING_ANSWER/);
for(const record of ASSESSMENT_EVIDENCE){
 assert.equal(record.normAvailable,false);
 assert(["optional-after-verification","not-offered"].includes(record.fullReportOffer));
 assert(record.limitations.length>=25);
 assert(record.path.startsWith("/assessment-center/"));
}
for(const f of ["src/app/assessment-center/reading-practice-16/page.tsx","src/app/assessment-center/methodology/page.tsx","src/components/ReadingPracticeClient.tsx"])
 assert(fs.existsSync(f),f+" exists");
const ui=fs.readFileSync("src/components/ReadingPracticeClient.tsx","utf8");
assert(/监护人/.test(ui));
assert(!/fetch\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest/.test(ui),"reading answers remain in memory");
console.log("READING_CENTER=PASS passages=4 original_items=16 evidence_quotes=16 dimensions=4 scores=DETERMINISTIC norms=NONE storage=MEMORY_ONLY products=4");
