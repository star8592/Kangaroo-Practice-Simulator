import assert from "node:assert/strict";
import { EXAM_DIRECTORY } from "../src/lib/exam-directory";
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
const activeTopics=EXAM_DIRECTORY.flatMap(g=>g.topics.filter(t=>t.status==="live"&&t.href));
for(const item of activeTopics) assert.ok(entries.some(e=>e.id==="topic-"+item.id&&e.href===item.href));
for(const needle of ["/skill-labs/sql-lab","/career/interviews","/assessment-center/career-aptitude-40"])
 assert.ok(entries.some(e=>e.href===needle),"Previously incorrectly hidden live content: "+needle);
assert.ok(entries.some(e=>e.href==="/career"&&e.kind==="职业岗位"));
assert.ok(entries.filter(e=>e.href.startsWith("/career/exams/")).every(e=>e.kind==="职业岗位"));
assert.ok(!EXAM_DIRECTORY.some(g=>g.domainId==="career"||g.domainId==="interest"));
console.log("SOCTHINK_SITE_DISCOVERY=PASS; items="+entries.length+"; updates="+updates.length+"; topics="+activeTopics.length);
