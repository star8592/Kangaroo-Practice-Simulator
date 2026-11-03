import assert from "node:assert/strict";
import {AGENT_PROJECT_MODULES,AGENT_PROJECT_ID} from "../src/lib/agent-project-course";
import {readFileSync} from "node:fs";

assert.match(AGENT_PROJECT_ID,/^[a-z0-9-]+$/);
assert.equal(AGENT_PROJECT_MODULES.length,6);
const ids=AGENT_PROJECT_MODULES.map(m=>m.id);
assert.equal(new Set(ids).size,6);
for(const m of AGENT_PROJECT_MODULES){
 assert.ok(m.title.length>=6&&m.goal.length>=10&&m.concept.length>=50);
 assert.ok(m.code.length>30&&m.assignment.length>15&&m.expected.length>=10);
 assert.ok(m.options.length===4&&new Set(m.options).size===4);
 assert.ok(Number.isInteger(m.answer)&&m.answer>=0&&m.answer<4);
 assert.ok(m.why.length>=20);
}
assert.deepEqual(ids,["input-contract","decision-route","permission","prompt-injection","idempotency","failure-evidence"]);
const page=readFileSync("src/app/skill-labs/agent-foundations/page.tsx","utf8");
assert.ok(page.includes("<AgentProjectCourse/>"),"The existing course must host practical modules");
assert.ok(page.includes("href=\"#agent-project\""),"Landing must offer direct start action");
const path=readFileSync("src/lib/career-paths.ts","utf8");
assert.ok(path.includes('name:"AI Agent 项目制工程课程"')&&path.includes('href:"/skill-labs/agent-foundations"'));
assert.ok(!page.includes("购买实战包")&&!page.includes("立即付费"));
console.log("AGENT_PROJECT_COURSE=PASS modules=6 knowledge_checks=6 source_claims=VERIFIED no_fake_checkout=YES");
