import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {PRIMARY_BUSINESS_NAV,BUSINESS_SUBROUTES,businessForPublicPath,legacyExamHashDestination}
 from "../src/lib/site-architecture";
import {EXAM_DIRECTORY,EXAM_DOMAIN_IDS,validateExamDirectory} from "../src/lib/exam-directory";
import {ASSESSMENT_DOMAINS} from "../src/lib/assessment-platform";

const root=(href:string)=>path.join(process.cwd(),"src/app",href.slice(1),"page.tsx");
const targets=[
 ["career","/career","岗位方向"],
 ["skills","/learn","学习与实训"],
 ["practice","/practice","模拟笔试与面试"],
];
assert.deepEqual(PRIMARY_BUSINESS_NAV.map(x=>[x.id,x.href,x.zh]),targets);
assert.equal(new Set(PRIMARY_BUSINESS_NAV.map(x=>x.href)).size,3);
for(const item of PRIMARY_BUSINESS_NAV){
 assert.ok(fs.existsSync(root(item.href)),"Missing public business entry: "+item.href);
 assert.equal(businessForPublicPath(item.href),item.id);
 assert.equal(businessForPublicPath(item.href+"/deep/route?x=1"),item.id);
}
const cases=[
 ["/arithmetic","exams"],["/arithmetic/print","exams"],
 ["/math","exams"],["/math-practice","exams"],["/competitions","exams"],
 ["/review","exams"],["/exam-planner","exams"],["/events","exams"],
 ["/skill-labs/books","skills"],["/skill-labs/books/a-book","skills"],
 ["/skill-labs/sql-lab","skills"],["/career/interviews","career"],
 ["/career/exams/role-exam","career"],["/career/guides/a-guide","career"],
 ["/assessment-center/methodology","assessments"],["/shop/example","store"],
 ["/resources/competitions/example","resources"],
 ["/exam/maa-amc-8-test","exams"],["/result","exams"],["/report/attempt-1","exams"],
] as const;
for(const [href,owner] of cases)assert.equal(businessForPublicPath(href),owner,href);
for(const item of BUSINESS_SUBROUTES){
 assert.ok(fs.existsSync(root(item.path)),"Legacy secondary route disappeared: "+item.path);
 assert.ok(!PRIMARY_BUSINESS_NAV.some(x=>x.href===item.path),"Subfeature wrongly promoted to L1");
 assert.equal(businessForPublicPath(item.path),item.owner);
}
for(const route of ["/","/search","/login","/account","/membership"])
 assert.equal(businessForPublicPath(route),null,"Cross-cutting utility is not a new business");
assert.equal(legacyExamHashDestination("domain-career"),"/career");
assert.equal(legacyExamHashDestination("domain-interest"),"/assessment-center");
assert.equal(legacyExamHashDestination("domain-math-competition"),null);
assert.deepEqual(EXAM_DIRECTORY.map(x=>x.domainId),[...EXAM_DOMAIN_IDS]);
assert.deepEqual(validateExamDirectory(),[]);
assert.equal(EXAM_DIRECTORY.length,5);
assert.equal(ASSESSMENT_DOMAINS.length,7,"Underlying assessment-core contract must remain intact");
assert.ok(!EXAM_DIRECTORY.some(x=>x.domainId==="career"||x.domainId==="interest"));
const read=(file:string)=>fs.readFileSync(file,"utf8");
const header=read("src/components/SiteHeader.tsx");
const home=read("src/components/PublicHome.tsx");
const footer=read("src/components/SiteFooter.tsx");
const exam=read("src/components/AssessmentPortalClient.tsx");
assert.ok(header.includes("PRIMARY_BUSINESS_NAV as TASK_LINKS"),
 "Header must use canonical primary navigation, not a local duplicate array");
assert.ok(home.includes("PRIMARY_BUSINESS_NAV.flatMap"),
 "Homepage service cards must derive from canonical primary navigation");
for(const item of PRIMARY_BUSINESS_NAV)
 assert.ok(footer.includes('href:"'+item.href+'"'),"Footer has lost public business: "+item.href);
for(const slug of ["/arithmetic","/competitions","/review","/exam-planner"])
 assert.ok(exam.includes('href="'+slug+'"'),"Exam parent must expose its secondary service: "+slug);
for(const route of ["/career","/skill-labs","/assessment-center"])
 assert.ok(!exam.includes('href="'+route+'"'),"Exam page must not duplicate another business: "+route);
assert.ok(!header.includes("在线练习")&&!header.includes('href:"/exam-planner"'),
 "Standalone practice/calendar must not be a primary nav entry");
// RootLayout owns the only <main> landmark; business screens use sections/divs.
const layout=read("src/app/layout.tsx");
assert.equal((layout.match(/<main\b/g)||[]).length,1,"Root layout must have a single main");
for(const page of ["src/app/career/page.tsx","src/app/career/exams/[id]/page.tsx",
 "src/app/career/guides/[id]/page.tsx","src/app/career/roles/[id]/page.tsx"]){
 const body=read(page);
 assert.ok(!/<main\b/.test(body),"Nested main landmark in "+page);
}
for(const page of ["src/app/assessment-center/[id]/page.tsx",
 "src/app/assessment-center/advanced-reasoning-40/page.tsx",
 "src/app/assessment-center/career-aptitude-40/page.tsx",
 "src/app/assessment-center/reasoning-practice-20/page.tsx",
 "src/app/assessment-center/reading-practice-16/page.tsx"]){
 const body=read(page);
 assert.ok(!body.includes('href="/assessments"'),"Assessment breadcrumb points to wrong business: "+page);
 assert.ok(body.includes('href="/assessment-center"'),"Assessment owner link missing: "+page);
}
assert.equal(businessForPublicPath("/student"),null,"Account/learning history is not a seventh business");
assert.equal(businessForPublicPath("/parent"),null,"Legacy family account must not appear as public business");
const doc="docs/architecture/SOCTHINK_SITE_ARCHITECTURE_MASTER.md";
assert.ok(fs.existsSync(doc),"Canonical site architecture document is missing");
const text=read(doc);
for(const word of ["校招","社招","学习与实训","岗位方向","SEO/GEO","URL","验收"])
 assert.ok(text.includes(word),"Canonical architecture is missing: "+word);
console.log("SOCTHINK_SITE_ARCHITECTURE=PASS businesses=3 exam_groups=5 legacy_routes="+BUSINESS_SUBROUTES.length+" cross_paths="+cases.length);

// Career-first public navigation is separate from the still-working math classroom routes.
for(const url of ["/assessments","/resources","/shop","/competitions","/arithmetic"])
 assert.ok(!PRIMARY_BUSINESS_NAV.some(x=>x.href===url),"Classroom/transaction path leaked into main navigation: "+url);
for(const entry of ["/learn","/practice"]){
 assert.ok(home.includes('href:"'+entry+'"')||home.includes('href=\"'+entry+'\"'),"Home missing career task "+entry);
 const html=read("src/app"+entry+"/page.tsx");
 assert.ok(html.includes('canonical:"'+entry+'"'),"Career hub has no canonical: "+entry);
}
