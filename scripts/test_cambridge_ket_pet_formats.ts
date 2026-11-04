import assert from "node:assert/strict";
import {CAMBRIDGE_EXAMS,fullMockBankCompleteness,type CambridgeLevel,type ContentPart} from "../src/lib/cambridge-ket-pet";
import {CAMBRIDGE_STARTER_QUESTIONS} from "../src/lib/cambridge-starter-questions";
for(const level of ["ket","pet"] as const){
  const exam=CAMBRIDGE_EXAMS[level];
  assert.equal(exam.id,level);
  assert.equal(exam.schoolVariant,true);
  assert.equal(exam.digitalAndPaperTasksEquivalent,true);
  assert.equal(exam.papers.reduce((n,p)=>n+p.weightingPercent,0),100);
  const pairs=new Set(exam.papers.map(p=>p.id));
  assert.equal(pairs.size,exam.papers.length);
  for(const paper of exam.papers){
    assert.equal(paper.parts.length,new Set(paper.parts.map(p=>p.number)).size);
    assert(paper.parts.every(p=>p.number>=1));
    if(paper.id==="listening"){
      assert.equal(paper.audioPlayedTwice,true);
      assert.equal(paper.paperTransferMinutesIncluded,6);
    }
  }
  assert.equal(fullMockBankCompleteness(level,[]).ready,false);
  const simulatedFullManifest:ContentPart[]=exam.papers.flatMap(p=>p.parts.map(part=>({
    paperId:p.id,partNumber:part.number,
    independentlyReviewedQuestionCount:part.questions??0,
    rightsCleared:true,audioComplete:p.id==="listening",
    speakingPromptReviewed:p.id==="speaking",
    examinerRubricReady:p.id==="speaking",
  })));
  assert.equal(fullMockBankCompleteness(level,simulatedFullManifest).ready,true);
  const brokenManifest=simulatedFullManifest.map(x=>x.audioComplete?{...x,audioComplete:false}:x);
  assert.equal(fullMockBankCompleteness(level,brokenManifest).ready,false);
  assert(exam.sourceFormatUrl.startsWith("https://www.cambridgeenglish.org/"));
  assert(exam.sourcePreparationUrl.startsWith("https://www.cambridgeenglish.org/"));
}
const key=CAMBRIDGE_EXAMS.ket;
assert.equal(key.cefr,"A2");
assert.equal(key.papers.length,3);
assert.deepEqual(key.papers.map(p=>p.weightingPercent),[50,25,25]);
assert.equal(key.papers[0].minutes,60);
assert.deepEqual(key.papers[0].parts.map(p=>p.questions),[6,7,5,6,6,1,1]);
assert.equal(key.papers[0].parts.reduce((n,p)=>n+(p.questions??0),0),32);
assert.equal(key.papers[1].parts.reduce((n,p)=>n+(p.questions??0),0),25);
assert.equal(key.papers[0].parts[5].minimumWords,25);
assert.equal(key.papers[0].parts[6].minimumWords,35);
assert.equal(key.papers[0].parts[5].maxPointsEach,15);
assert.deepEqual(key.papers[2].approximatePairMinutes,[8,10]);
const pet=CAMBRIDGE_EXAMS.pet;
assert.equal(pet.cefr,"B1");
assert.equal(pet.papers.length,4);
assert.deepEqual(pet.papers.map(p=>p.weightingPercent),[25,25,25,25]);
assert.deepEqual(pet.papers.map(p=>p.minutes),[45,45,30,null]);
assert.deepEqual(pet.papers[0].parts.map(p=>p.questions),[5,5,5,5,6,6]);
assert.deepEqual(pet.papers[1].parts.map(p=>p.questions),[1,1]);
assert.equal(pet.papers[1].parts[1].choiceBetweenPrompts,true);
assert.deepEqual(pet.papers[2].parts.map(p=>p.questions),[7,6,6,6]);
assert.equal(pet.papers[3].parts.length,4);
const ids=new Set(CAMBRIDGE_STARTER_QUESTIONS.map(q=>q.id));
assert.equal(ids.size,CAMBRIDGE_STARTER_QUESTIONS.length);
assert.equal(CAMBRIDGE_STARTER_QUESTIONS.length,8);
for(const x of CAMBRIDGE_STARTER_QUESTIONS){
  assert(x.source==="socthink_original_diagnostic");
  assert(x.options.length===3);
  assert(x.answerIndex>=0&&x.answerIndex<3);
  assert(x.prompt.length>10);
  assert(x.explanationZh.length>5);
}
console.log("CAMBRIDGE_KET_PET_OFFICIAL_FORMAT_TEST=PASS");
console.log("KET parts",key.papers.map(p=>p.parts.length),"PET parts",pet.papers.map(p=>p.parts.length));
console.log("ORIGINAL_DIAGNOSTIC_QUESTIONS",CAMBRIDGE_STARTER_QUESTIONS.length);
