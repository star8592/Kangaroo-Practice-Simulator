import assert from "node:assert/strict";
import {attentionBudget,buildAttentionItems} from "../src/lib/academic-events/attention-engine";
import type {AcademicEvent,AcademicMilestone,AcademicSession} from "../src/lib/academic-events/types";

const events:AcademicEvent[]=[
 {id:"amc",programId:"amt",kind:"competition",titleZh:"澳洲 AMC",titleEn:"Australian AMC",minGrade:1,maxGrade:12},
 {id:"amc12",programId:"maa",kind:"competition",titleZh:"AMC 12",titleEn:"AMC 12",minGrade:9,maxGrade:12},
 {id:"future",programId:"x",kind:"competition",titleZh:"适龄新赛事",titleEn:"Future",minGrade:1,maxGrade:3},
];
const sessions:AcademicSession[]=[
 {id:"amc26",eventId:"amc",season:2026,region:"CN",mode:"online-home",sourceIds:["official"],milestoneIds:["mock","exam"]},
 {id:"amc12-26",eventId:"amc12",season:2026,region:"CN",mode:"onsite",sourceIds:["official"],milestoneIds:["amc12reg"]},
 {id:"future26",eventId:"future",season:2026,region:"CN",mode:"onsite",sourceIds:["school"],milestoneIds:["futureReg"]},
];
const milestones:AcademicMilestone[]=[
 {id:"mock",sessionId:"amc26",kind:"mock",start:"2026-10-06",titleZh:"完成官方模考",titleEn:"Complete mock",sourceId:"official",consequence:"critical"},
 {id:"exam",sessionId:"amc26",kind:"exam",start:"2026-10-11",titleZh:"正式考试",titleEn:"Exam",sourceId:"official",consequence:"critical"},
 {id:"amc12reg",sessionId:"amc12-26",kind:"registration-deadline",start:"2026-10-10",titleZh:"AMC12报名",titleEn:"AMC12 reg",sourceId:"official",consequence:"important"},
 {id:"futureReg",sessionId:"future26",kind:"registration-deadline",start:"2026-10-12",titleZh:"适龄赛事报名",titleEn:"Future reg",sourceId:"school",consequence:"important"},
];
const items=buildAttentionItems({events,sessions,milestones,today:"2026-10-06",student:{grade:1,region:"CN",enrollments:{amc26:"registered",future26:"eligible"}}});
assert.equal(items[0].milestone.id,"mock");
assert.equal(items[0].priority,"P1");
assert.equal(items.some(x=>x.event.id==="amc12"),false,"wrong-grade event must be suppressed");
assert.equal(items.find(x=>x.event.id==="future")?.priority,"P2");
const budget=attentionBudget([...items,...items,...items]);
assert.ok(budget.next.length<=3);
assert.ok(budget.doNow);
console.log("ATTENTION_ENGINE=PASS",items.map(x=>[x.milestone.id,x.priority,x.daysUntil]));
