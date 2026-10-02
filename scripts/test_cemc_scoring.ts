import assert from "node:assert/strict";
import { gradeExam } from "../src/lib/grading";
import { normalizeExamProfile } from "../src/lib/competition-format";
import type { ExamProfile, Question } from "../src/lib/types";
const base: ExamProfile = {id:"test", name:"test", grades:"Grade 7", durationSeconds:3600, questionCount:25, initialScore:0, maxScore:150, wrongPenaltyMode:"fixed", wrongPenaltyValue:0, blankScoreValue:0, competitionId:"cemc"};
const qs: Question[] = Array.from({length:25},(_,i)=>({id:`q${i+1}`, year:2023, level:"Gauss", grades:"Grade 7", language:"en", questionNo:i+1, points:i<10?5:i<20?6:8, answerMode:"choice", concept:"test", stem:"test", choices:[{key:"A",label:"1"},{key:"B",label:"2"}], answer:"A", solution:"", sourceFile:"test", examReady:true}));
for (const formatId of ["cemc-gauss-7","cemc-gauss-8","cemc-pascal","cemc-cayley","cemc-fermat"]) {
 const profile=normalizeExamProfile({...base,formatId});
 assert.deepEqual(normalizeExamProfile(profile),profile,"normalization is idempotent");
 assert.equal(gradeExam(qs,{},profile).score,20,"all blank is capped");
 assert.equal(gradeExam(qs,Object.fromEntries(qs.map(q=>[q.id,"A"])),profile).score,150);
 assert.equal(gradeExam(qs,Object.fromEntries(qs.map(q=>[q.id,"B"])),profile).score,0);
 for(const blankCount of [0,1,9,10,11,25]) {
  const answers=Object.fromEntries(qs.slice(blankCount).map(q=>[q.id,"A"]));
  const result=gradeExam(qs,answers,profile);
  assert.equal(result.score,qs.slice(blankCount).reduce((s,q)=>s+q.points,0)+Math.min(blankCount,10)*2);
  assert.equal(result.items.reduce((s,q)=>s+q.scoreDelta,0),result.score);
 }
}
assert.equal(normalizeExamProfile({...base,formatId:"cemc-euclid"}).blankScoreValue,0,"written contest unchanged");
assert.equal(gradeExam(qs,{}, {...base,competitionId:"maa-amc",blankScoreValue:1.5}).score,37.5,"AMC remains uncapped");
assert.equal(gradeExam(qs,{}, {...base,competitionId:"kangaroo"}).score,0);
console.log("CEMC_SCORING=PASS blank_cap=20 full=150 formats=5 legacy_compatibility=PASS");
