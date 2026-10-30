import assert from "node:assert/strict";
import {
  ORAL_EXAMS,allowedOralAction,validateOralExamBlueprint,validateOralExamRegistry,
} from "../src/lib/oral-exam-blueprints";
import type {OralExamBlueprint} from "../src/lib/oral-exam-blueprints";

assert.deepEqual(validateOralExamRegistry(),[], "all oral-exam rules must validate");
assert.equal(ORAL_EXAMS.length,5);
assert.equal(ORAL_EXAMS.every(e=>e.status==="planned" && e.unofficialPractice),true);

const key=ORAL_EXAMS.find(e=>e.id==="cambridge-a2-key")!;
assert.equal(key.examinerCount,2);
assert.equal(key.virtualPartnerRequired,true);
assert.equal(key.sections[1].requiresVirtualPartner,true);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:1,action:"partner-answer",actor:"virtual-partner"}),true);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:0,action:"partner-answer",actor:"virtual-partner"}),false);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:1,action:"coach",actor:"examiner"}),false);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:1,action:"replay-exam-prompt",actor:"examiner"}),false);
assert.equal(allowedOralAction({exam:key,mode:"coached-practice",sectionIndex:1,action:"coach",actor:"examiner"}),true);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:0,action:"finish",actor:"examiner"}),false);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:1,action:"finish",actor:"examiner"}),true);
assert.equal(allowedOralAction({exam:key,mode:"full-mock",sectionIndex:2,action:"answer",actor:"candidate"}),false);

const pet=ORAL_EXAMS.find(e=>e.id==="cambridge-b1-preliminary")!;
assert.equal(pet.sections.length,4);
assert.equal(pet.sections[2].taskTypes[0],"partner-discussion");
assert.equal(allowedOralAction({exam:pet,mode:"full-mock",sectionIndex:2,action:"partner-answer",actor:"virtual-partner"}),true);

const ielts=ORAL_EXAMS.find(e=>e.id==="ielts-speaking")!;
assert.deepEqual(ielts.sections.map(s=>s.taskTypes[0]),["examiner-interview","individual-long-turn","extended-discussion"]);
assert.equal(ielts.virtualPartnerRequired,false);
assert.equal(ielts.rubricDimensions.length,4);
assert.equal(allowedOralAction({exam:ielts,mode:"full-mock",sectionIndex:1,action:"partner-answer",actor:"virtual-partner"}),false);

const toefl=ORAL_EXAMS.find(e=>e.id==="toefl-ibt-speaking-2026")!;
assert.equal(toefl.effectiveFrom,"2026-01-21");
assert.deepEqual(toefl.sections.flatMap(s=>s.taskTypes),["listen-and-repeat","computer-interview"]);
assert.equal(toefl.examinerCount,0);
const oldToefl = {...toefl,sections:[...toefl.sections,{id:"old-independent",order:3,taskTypes:["individual-long-turn" as const],examinerPrompts:false,requiresVirtualPartner:false}]};
assert.equal(validateOralExamBlueprint(oldToefl).includes("toefl-2026-format-mismatch"),true);
assert.equal(validateOralExamBlueprint({...toefl,effectiveFrom:"2025-01-01"}).includes("toefl-2026-format-mismatch"),true);

const pte=ORAL_EXAMS.find(e=>e.id==="pte-academic-speaking")!;
assert.equal(pte.approximateDurationMinutes,undefined);
assert.equal(pte.sections[0].taskTypes.includes("summarize-group-discussion"),true);
assert.equal(validateOralExamBlueprint({...pte,approximateDurationMinutes:[15,15]}).includes("pte-enhanced-format-mismatch"),true);

function hasError(blueprint: OralExamBlueprint,needle:string) {
  assert.ok(validateOralExamBlueprint(blueprint).includes(needle),needle);
}
hasError({...key,virtualPartnerRequired:false},"candidate-partner-mismatch");
hasError({...key,examinerCount:1},"cambridge-examiner-count-mismatch");
hasError({...key,officialSource:"https://example.com" ,status:"live" as "planned"},"misleading-public-readiness");
hasError({...ielts,sections:[...ielts.sections].reverse()},"invalid-section-sequence");
hasError({...ielts,rubricDimensions:[]},"missing-rubric-dimensions");
console.log("ORAL_EXAM_BLUEPRINTS=PASS (KET/PET pair roles, IELTS 3 parts, 2026 TOEFL, PTE updated, honest readiness, mode guard)");
