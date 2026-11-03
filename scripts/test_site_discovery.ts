import assert from "node:assert/strict";
import { CAREER_PATHS } from "../src/lib/career-paths";
import { TECH_BOOKS } from "../src/lib/tech-books";
import { publicDiscoveryEntries, matchDiscoveryEntries, homepageUpdates, homepageCounts } from "../src/lib/site-discovery";

const entries=publicDiscoveryEntries();
const seen=new Set<string>();
for(const entry of entries){
 assert.ok(entry.id&&entry.title&&entry.summary&&entry.kind);
 assert.ok(!seen.has(entry.id),"Duplicate public discovery id: "+entry.id);
 seen.add(entry.id);
 assert.match(entry.href,/^\/(?!\/)[^?#\s]+$/,"Only real internal public routes are permitted");
}
const updates=homepageUpdates();
assert.ok(updates.length>=5,"Homepage must not stay a static three-card exam shell");
assert.ok(updates.every(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date)));
assert.deepEqual(updates.map(x=>x.date),updates.map(x=>x.date).sort().reverse(),"Actual updates sorted by published date");
for(const item of updates) assert.ok(entries.some(e=>e.href===item.href)||item.href==="/skill-labs/books","Every update must lead to published content");
const stats=homepageCounts();
assert.equal(stats.books,TECH_BOOKS.length);
assert.ok(stats.formalPapers>=4 && stats.assessments>=9);
assert.ok(matchDiscoveryEntries(entries,"Rust").some(e=>e.href==="/skill-labs/books/the-rust-programming-language"));
assert.ok(matchDiscoveryEntries(entries,"SQL").some(e=>e.href==="/skill-labs/sql-lab"));
assert.ok(matchDiscoveryEntries(entries,"Agent").some(e=>e.href==="/skill-labs/agent-foundations"));
assert.equal(matchDiscoveryEntries(entries,"somerandomwordwithoutmatch").length,0);
assert.ok(CAREER_PATHS.every(path=>entries.some(e=>e.href==="/career/paths/"+path.slug)),
  "Every real career path must be found through global search");
assert.ok(entries.some(e=>e.title==="智能体开发工程师"&&e.href==="/career/roles/intelligence-01-04"),
  "Every named job must be findable");
for(const e of entries)assert.ok(!["/assessments","/resources","/exam-planner","/shop","/math","/competitions","/arithmetic"].some(path=>e.href===path||e.href.startsWith(path+"/")),
 "Math content leaked into public career discovery: "+e.href);
for(const needle of ["/skill-labs/sql-lab","/career/interviews","/assessment-center/career-aptitude-40"])
 assert.ok(entries.some(e=>e.href===needle),"Previously incorrectly hidden live content: "+needle);
assert.ok(entries.some(e=>e.href==="/career"&&e.kind==="职业岗位"));
assert.ok(entries.filter(e=>e.href.startsWith("/career/exams/")).every(e=>e.kind==="职业岗位"));
assert.ok(!matchDiscoveryEntries(entries,"数学竞赛").some(e=>e.kind==="考试"),"Career search must not query mathematics catalogue");
console.log("SOCTHINK_SITE_DISCOVERY=PASS; items="+entries.length+"; updates="+updates.length+"; careerPaths="+CAREER_PATHS.length);
