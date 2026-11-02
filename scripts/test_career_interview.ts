import assert from "node:assert/strict";
import {INTERVIEW_PROFILES,getInterviewProfile,selectFollowup,buildInterviewReview,validateInterviewProfiles} from "../src/lib/career-interview-scenarios";
assert.deepEqual(validateInterviewProfiles(),[]);
assert.equal(INTERVIEW_PROFILES.length,2);
assert.equal(new Set(INTERVIEW_PROFILES.map(p=>p.id)).size,2);
for(const profile of INTERVIEW_PROFILES){
 assert.equal(profile.questions.length,5);
 assert.equal(new Set(profile.questions.map(q=>q.id)).size,5);
 assert(profile.questions.every(q=>q.evidence.length===3));
 for(const q of profile.questions){
  assert.equal(selectFollowup(q,"还没有想好").label,"需要补充背景");
  assert.equal(selectFollowup(q,"我们的团队当时主要围绕需求和业务场景重新制定了总体安排，大家讨论了多次不同方案，但没有明确介绍由谁单独负责执行和评估整个过程；同时团队其他成员还分享了多个项目阶段的方案，这段描述只使用了团队整体的视角。").label,"核查个人贡献");
  assert.equal(selectFollowup(q,"我负责这个项目的接口设计与日常开发，我组织团队做了多轮沟通并最终上线业务系统，但当时还没有形成明确的衡量口径和数据报告。后来我对比了前后多个版本的指标与测试记录，也整理了真实用户在8次迭代中的反馈证据。").label,"深入决策");
 }
 const first=profile.questions[0];
 const entries={[first.id]:{id:first.id,answer:"我在这个项目中负责模块A，并做过技术权衡。",followup:first.followups.ownership,
  followupAnswer:"我负责的接口方案和代码测试都经过了同学复核。",selfChecked:[first.evidence[0].id]}};
 const report=buildInterviewReview(profile,entries);
 assert.equal(report.total,5);
 assert.equal(report.completed,1);
 assert.equal(report.questions[0].answer,entries[first.id].answer);
 assert.equal(report.questions[0].followupAnswer,entries[first.id].followupAnswer);
 assert.deepEqual(report.questions[0].selfReviewed,[first.evidence[0].label]);
 assert(report.practicePoints.includes(first.evidence[1].action));
 assert(report.questions[1].answered===false);
}
assert.equal(getInterviewProfile("invalid"),undefined);
assert.notEqual(INTERVIEW_PROFILES[0].questions[2].prompt,INTERVIEW_PROFILES[1].questions[2].prompt);
console.log("CAREER_INTERVIEW_STRUCTURED=PASS profiles=2 main_questions=10 dynamic_branches=4 per_question=YES evidence_sections=30 truthful_report=YES");
