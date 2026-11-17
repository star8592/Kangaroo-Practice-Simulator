import assert from "node:assert/strict";
import {validAssignment,assignmentStatus,scoreLabel} from
 "../src/features/platform/student-class-assignment-model";
const original={
 id:"55555555-5555-4555-8555-555555555555",title:"老师的作业",
 lifecycle:"published" as const,published_at:"2026-11-17T10:00:00.000Z",
 sentence_count:2,receipt_status:"not_started",claimed:false,submitted:false,
 attempt_count:0,best_score:null,feedback_count:0,
};
assert.ok(validAssignment(original));
assert.equal(assignmentStatus(original),"待开始");
assert.equal(assignmentStatus({...original,claimed:true}),"练习中");
assert.equal(assignmentStatus({...original,submitted:true}),"已提交");
assert.equal(assignmentStatus({...original,lifecycle:"closed"}),"已结束");
assert.equal(scoreLabel(null),"暂无评分");
assert.equal(scoreLabel(87.64),"87.6 分");
assert.equal(validAssignment({...original,best_score:117}),false);
assert.equal(validAssignment({...original,attempt_count:-1}),false);
assert.equal(validAssignment({...original,title:""}),false);
assert.equal(validAssignment({...original,id:"other-teacher"}),false);
console.log("STUDENT_CLASS_ASSIGNMENT_MODEL=PASS statuses=4 source=verified");
