import assert from "node:assert/strict";
import {
  XIAOSHENGCHU_SOURCE_DIRECTORY as sources,
  XIAOSHENGCHU_SCHOOL_EVIDENCE as evidence,
  listXiaoshengchuSchools,
  listXiaoshengchuSourceYears,
  classifyXiaoshengchuSource,
  canonicalXiaoshengchuSchool,
  queryXiaoshengchuDirectory,
  queryXiaoshengchuSchoolEvidence,
} from "../src/lib/xiaoshengchu-directory";
import { ASSESSMENT_DOMAINS } from "../src/lib/assessment-platform";

assert.equal(sources.length, 182, "staging source list must be complete");
assert.equal(evidence.length, 39, "school source evidence list must be complete");
assert.equal(new Set(sources.map(x=>x.id)).size, 182);
assert.equal(new Set(sources.map(x=>x.url)).size, 182);
assert(sources.every(x=>x.rights==="未核实" && x.authenticity==="未核实" &&
  !x.fullPaperObtained && !x.publishable), "unverified content must not be publishable");
assert(sources.every(x=>x.url.startsWith("https://")||x.url.startsWith("http://")));
assert(evidence.every(x=>!x.publishable));
assert.equal(canonicalXiaoshengchuSchool("华一寄"),"华宜寄宿学校");
assert.equal(canonicalXiaoshengchuSchool("光谷未来"),"武汉光谷未来学校");
assert.equal(canonicalXiaoshengchuSchool("光谷为明"),"光谷为明学校");
assert.notEqual(canonicalXiaoshengchuSchool("光谷未来"),canonicalXiaoshengchuSchool("光谷为明"));
assert.equal(canonicalXiaoshengchuSchool("多校/跨平台","武汉小升初汇总"),"综合资料／学校待核");
assert.equal(canonicalXiaoshengchuSchool("多校/跨平台","武钢实验与华宜寄宿试题汇编"),"综合资料／学校待核");

assert.equal(classifyXiaoshengchuSource({title:"2026回忆版",recordType:"网站标称试卷"}),"回忆题");
assert.equal(classifyXiaoshengchuSource({title:"2026模拟预测题",recordType:"数学试卷"}),"预测模拟");
assert.equal(classifyXiaoshengchuSource({title:"开放日活动信息",recordType:"活动与资讯"}),"活动与资讯");

const all=queryXiaoshengchuDirectory();
assert.equal(all.total,182);
assert.equal(all.page,1);
assert.equal(all.rows.length,20);
assert.equal(all.totalPages,10);
const last=queryXiaoshengchuDirectory({page:999});
assert.equal(last.page,10,"page out of range must clamp");
assert.equal(last.rows.length,2);
assert.equal(queryXiaoshengchuDirectory({page:-5}).page,1);
assert(queryXiaoshengchuDirectory({q:"武钢实验"}).total>0);

const cohort=queryXiaoshengchuDirectory({year:"2026"});
assert(cohort.total>0);
for(const item of Array.from({length:cohort.totalPages},(_,i)=>queryXiaoshengchuDirectory({year:"2026",page:i+1})).flatMap(x=>x.rows)) {
  assert(["2026","2026届"].includes(item.year),"2026 cohort must not automatically include 2025-2026 school-year exams");
}
assert(listXiaoshengchuSourceYears().includes("2026"));
assert(listXiaoshengchuSchools().includes("武汉光谷未来学校"));
const future=queryXiaoshengchuDirectory({school:"武汉光谷未来学校"});
assert(future.rows.every(x=>x.school==="武汉光谷未来学校"));
assert(queryXiaoshengchuSchoolEvidence().length>0);
assert(queryXiaoshengchuSchoolEvidence("点睛").every(x=>x.school.includes("点睛")));
assert(queryXiaoshengchuSchoolEvidence("","武汉光谷未来学校").every(x=>x.school==="武汉光谷未来学校"));
assert.equal(queryXiaoshengchuDirectory({q:"zqx_should_not_exist_8342"}).total,0);

const schoolDomain=ASSESSMENT_DOMAINS.find(x=>x.id==="school");
assert(schoolDomain?.liveRoutes.some(x=>x.href==="/assessments/school/xiaoshengchu" &&
  x.title.zh.includes("来源")), "K12 home must link to the real directory without claiming a live exam");
assert(ASSESSMENT_DOMAINS.filter(x=>x.readiness==="live").length===2);
console.log("SOCTHINK_XIAOSHENGCHU_DIRECTORY_PASS sources=182 evidence=39 cohort=distinct rights=closed search=PASS pagination=PASS");
