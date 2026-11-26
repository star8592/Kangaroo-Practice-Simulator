import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ENGLISH_SPEAKING_ROOT,SPEAKING_REGIONS,regionPath,regionByYear,cityDefault,regionExamHref,WUHAN_SESSIONS} from "../src/lib/english-speaking-regions";
assert.equal(SPEAKING_REGIONS.length,5);
assert.equal(new Set(SPEAKING_REGIONS.map(r=>r.city)).size,4);
assert.equal(new Set(SPEAKING_REGIONS.map(regionPath)).size,5);
assert.equal(WUHAN_SESSIONS.flat().length,12);
assert.equal(regionByYear("beijing","2027"),undefined);
assert.equal(cityDefault("shanghai")?.year,"2026");
const site=readFileSync("src/app/sitemap.ts","utf8");
assert.match(site,/ENGLISH_SPEAKING_ROOT/);
assert.match(site,/SPEAKING_REGIONS.filter/);
for(const r of SPEAKING_REGIONS){
 assert.equal(regionByYear(r.city,r.year),r);
 assert.equal(regionPath(r),ENGLISH_SPEAKING_ROOT+"/"+r.city+"/"+r.year);
 assert.ok(r.skills.every(([name])=>r.drills?.some(d=>(d.skill??d.name)===name)));
 for(const paper of r.papers){
  const u=new URL(regionExamHref(r,paper,"simulation","test"),"https://socthink.cn");
  assert.equal(u.searchParams.get("paper"),r.paperId);
  assert.equal(u.searchParams.get("edition"),"city");
  assert.equal(u.searchParams.get("mode"),"simulation");
  assert.equal(u.searchParams.has("focus"),false);
  if(r.city==="wuhan"){assert.equal(r.papers.length,1);assert.equal(u.searchParams.get("version"),"W2");for(const legacy of ["W1","W3","W4","W5"])assert.equal(new URL(regionExamHref(r,{label:"legacy",note:"retired",version:legacy},"simulation"),"https://socthink.cn").searchParams.get("version"),"W2");}
 }
 for(const d of r.drills??[]){
  const u=new URL(regionExamHref(r,r.papers[0],"practice",d.id),"https://socthink.cn");
  assert.equal(u.searchParams.get("paper"),r.paperId);
  assert.equal(u.searchParams.get("edition"),"city");
  assert.equal(u.searchParams.get("focus"),d.id);
  assert.equal(u.searchParams.get("mode"),"practice");
 }
 console.log("PASS",r.paperId,r.papers.length,"papers",r.drills?.length,"precise drills");
}
console.log("REGIONAL_ENGLISH_PAGES_CONTRACT_PASS");
