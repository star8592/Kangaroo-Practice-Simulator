import assert from "node:assert/strict";
import {JUDGE_CASES,EXPECTED_DISTRIBUTION} from "./fixtures/career-judge-v1";
import {HOLDOUT_CASES,HOLDOUT_DISTRIBUTION} from "./fixtures/career-judge-holdout-v1";
import {getInterviewProfile} from "../src/lib/career-interview-scenarios";
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "../src/lib/career-interview-context";
import {validateSemanticRequest} from "../src/lib/career-semantic-followup";
import {makeGuidedMessages} from "../src/lib/career-guided-interview";

const seen=new Set<string>();
const counts={brief:0,ownership:0,outcome:0,depth:0};
const holdoutCounts={brief:0,ownership:0,outcome:0,depth:0};
const profiles=new Set<string>();
for(const item of [...JUDGE_CASES,...HOLDOUT_CASES]){
 assert(!seen.has(item.id),"duplicate case ID: "+item.id);
 seen.add(item.id);
 profiles.add(item.profileId);
 const profile=getInterviewProfile(item.profileId);
 assert(profile,"invalid role: "+item.id);
 assert(profile.questions.some(q=>q.id===item.questionId),"invalid question: "+item.id);
 assert(item.answer.length>=12&&item.answer.length<=2500,"invalid answer length: "+item.id);
 assert(item.labelReason.length>10,"needs gold rationale: "+item.id);
 if(HOLDOUT_CASES.some(x=>x.id===item.id))holdoutCounts[item.expected]++;
 else counts[item.expected]++;
 const input={profileId:item.profileId,questionId:item.questionId,answer:item.answer,context:EMPTY_INTERVIEW_JOB_CONTEXT};
 assert(validateSemanticRequest(input),"real API cannot accept fixture: "+item.id);
 const messages=makeGuidedMessages(input);
 assert(messages[1].content.includes(item.answer),"lost answer: "+item.id);
}
assert.equal(profiles.size,2);
assert.deepEqual(counts,EXPECTED_DISTRIBUTION);
assert.deepEqual(holdoutCounts,HOLDOUT_DISTRIBUTION);
assert.equal(JUDGE_CASES.length,20);
assert.equal(HOLDOUT_CASES.length,12);
console.log("CAREER_JUDGE_DATASET=PASS cases="+(JUDGE_CASES.length+HOLDOUT_CASES.length)+" role_count="+profiles.size+" branch_counts="+JSON.stringify(counts)+" gold_status=PROVISIONAL_SYNTHETIC");
