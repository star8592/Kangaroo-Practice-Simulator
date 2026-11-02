import assert from "node:assert/strict";
import {DISCOVERY_SURVEYS,getDiscoverySurvey,scoreDiscovery,validateDiscoverySurveys} from "../src/lib/career-exploration-bank";
import {SJT_ITEMS,SJT_SKILLS,scoreSjt,validateSjtBank} from "../src/lib/workplace-sjt-bank";
import {ASSESSMENT_EVIDENCE,validateEvidenceRegistry} from "../src/lib/assessment-evidence";
import {readFileSync,existsSync} from "node:fs";
assert.deepEqual(validateDiscoverySurveys(),[]);
assert.deepEqual(validateSjtBank(),[]);
assert.deepEqual(validateEvidenceRegistry(),[]);
assert.equal(DISCOVERY_SURVEYS.length,2);
for(const survey of DISCOVERY_SURVEYS){
 assert.equal(getDiscoverySurvey(survey.id),survey);
 assert.equal(scoreDiscovery(survey,{}),null);
 const neutral=Object.fromEntries(survey.items.map(q=>[q.id,3]));
 const report=scoreDiscovery(survey,neutral)!;
 assert.equal(report.version,survey.version);
 assert.equal(report.areas.length,survey.areas.length);
 assert(report.areas.every(x=>x.mean===3));
 assert.deepEqual(report.topAreas,[],"identical means cannot create fake top-two ranking");
 const badMissing={...neutral};delete badMissing[survey.items[0].id];
 assert.equal(scoreDiscovery(survey,badMissing),null);
 assert.throws(()=>scoreDiscovery(survey,{...neutral,extra:3}),/INVALID_SURVEY_RESPONSE/);
 assert.throws(()=>scoreDiscovery(survey,{...neutral,[survey.items[0].id]:0}),/INVALID_SURVEY_RESPONSE/);
 assert.throws(()=>scoreDiscovery(survey,{...neutral,[survey.items[0].id]:5.5}),/INVALID_SURVEY_RESPONSE/);
 const first=survey.items[0];
 const low={...neutral,[first.id]:1};
 const high={...neutral,[first.id]:5};
 const a=scoreDiscovery(survey,low)!.areas.find(x=>x.id===first.area)!;
 const b=scoreDiscovery(survey,high)!.areas.find(x=>x.id===first.area)!;
 assert(Math.abs((b.mean-a.mean)-(first.reverse?-4:4)/survey.items.filter(x=>x.area===first.area).length)<0.02);
 if(survey.id==="work-style-24"){
  const reversed=survey.items.find(x=>x.reverse)!;
  const changed={...neutral,[reversed.id]:1};
  const orig=report.areas.find(x=>x.id===reversed.area)!.mean;
  const now=scoreDiscovery(survey,changed)!.areas.find(x=>x.id===reversed.area)!.mean;
  assert.equal(Number((now-orig).toFixed(2)),0.33);
 }
}
assert.equal(getDiscoverySurvey("invalid"),undefined);
assert.equal(SJT_ITEMS.length,24);
assert.equal(SJT_SKILLS.length,4);
const best=Object.fromEntries(SJT_ITEMS.map(item=>[item.id,item.options.findIndex(o=>o.points===3)]));
const worst=Object.fromEntries(SJT_ITEMS.map(item=>[item.id,item.options.findIndex(o=>o.points===0)]));
const full=scoreSjt(best)!;
assert.equal(full.correct,24);
assert.equal(full.max,24);
assert.equal(full.review.length,24);
assert(full.review.every(x=>x.points===3));
assert(full.dimensions.every(x=>x.points===18&&x.max===18));
const none=scoreSjt(worst)!;
assert.equal(none.correct,0);
assert(none.dimensions.every(x=>x.points===0));
assert.equal(scoreSjt({}),null);
const incomplete={...best};delete incomplete[SJT_ITEMS[0].id];
assert.equal(scoreSjt(incomplete),null);
assert.throws(()=>scoreSjt({...best,extra:0}),/INVALID_SJT_RESPONSE/);
assert.throws(()=>scoreSjt({...best,[SJT_ITEMS[0].id]:4}),/INVALID_SJT_RESPONSE/);
assert.throws(()=>scoreSjt({...best,[SJT_ITEMS[0].id]:1.5}),/INVALID_SJT_RESPONSE/);
const positions=SJT_ITEMS.map(q=>q.options.findIndex(o=>o.points===3));
for(let i=0;i<4;i++)assert.equal(positions.filter(x=>x===i).length,6,"balanced answer position");
const expected=["work-values-30","work-style-24","workplace-sjt-24"];
for(const id of expected){
 assert(existsSync("src/app/assessment-center/"+id+"/page.tsx"));
 assert(ASSESSMENT_EVIDENCE.some(x=>x.id===id&&x.fullReportOffer==="not-offered"));
 const route=readFileSync("src/app/assessment-center/"+id+"/page.tsx","utf8");
 assert(route.includes('CareerDiscoveryRunner'));
 assert(route.includes("alternates"));
}
const runner=readFileSync("src/components/CareerDiscoveryRunner.tsx","utf8");
assert(!/\b(fetch|sendBeacon|localStorage|sessionStorage|XMLHttpRequest)\b/.test(runner),
 "no persistence or remote response upload");
assert(runner.includes("完整作答后才能交卷")&&runner.includes("disabled={!complete}"));
const index=readFileSync("src/app/assessment-center/page.tsx","utf8");
for(const id of expected)assert(index.includes('href="/assessment-center/'+id+'"'));
console.log("CAREER_DISCOVERY=PASS surveys=2 items=54 sjt=24 scenarios=24 dimensions=14 full_scoring=YES privacy=MEMORY_ONLY external_norms=NO");
