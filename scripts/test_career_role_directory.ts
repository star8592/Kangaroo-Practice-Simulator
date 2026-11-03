import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CAREER_ROLE_GROUPS,CAREER_ROLES,validateCareerRoleTaxonomy,
  searchCareerRoles,getCareerRole,
} from "../src/lib/career-role-taxonomy";
import {CAREER_ORIGINAL_GUIDES} from "../src/lib/career-original-guides";
import {CAREER_FORMAL_PAPERS} from "../src/lib/career-formal-bank";
import {INTERVIEW_PROFILES} from "../src/lib/career-interview-scenarios";
import {TECH_BOOKS} from "../src/lib/tech-books";
import {CAREER_PATHS,careerPathForRole,validateCareerPaths} from "../src/lib/career-paths";

assert.deepEqual(validateCareerRoleTaxonomy(),[]);
assert.equal(CAREER_ROLE_GROUPS.length,13,"browse 13 customer-facing industries");
assert.equal(CAREER_ROLES.length,270,"real role names, not synthetic job vacancies");
assert.equal(new Set(CAREER_ROLES.map(x=>x.title)).size,CAREER_ROLES.length);
assert(CAREER_ROLE_GROUPS.every(g=>g.segments.length>=2));
assert(CAREER_ROLE_GROUPS.every(g=>g.segments.every(s=>s.roles.length>=4)));
assert(CAREER_ROLES.every(x=>getCareerRole(x.id)?.title===x.title));
assert(searchCareerRoles("采购").length>=6);
assert(searchCareerRoles("数据").length>=10);
assert(searchCareerRoles("质量工程师").some(x=>x.title==="质量工程师"));
assert(searchCareerRoles("不存在的职业名称").length===0);
assert(searchCareerRoles("运营","product-ops").length>=4);
assert(searchCareerRoles("量化","construction").length===0);
assert.equal(CAREER_ORIGINAL_GUIDES.length,3);
assert.equal(CAREER_FORMAL_PAPERS.length,4);
assert.deepEqual(validateCareerPaths(),[],"All advertised career steps must match real content");
// Executed only in Node tests; never pull answer-bearing source banks into
// CareerRoleExplorer's browser JS bundle through career-paths.ts.
const liveExamHrefs=new Set(CAREER_FORMAL_PAPERS.filter(p=>p.deliveryState==="free-live-preview")
  .map(p=>"/career/exams/"+p.id));
const liveGuideHrefs=new Set(CAREER_ORIGINAL_GUIDES.filter(g=>g.deliveryState==="free-original-material")
  .map(g=>"/career/guides/"+g.id));
const liveInterviewHrefs=new Set(INTERVIEW_PROFILES.map(p=>"/career/interviews/"+p.id));
const bookHrefs=new Set(TECH_BOOKS.map(b=>"/skill-labs/books/"+b.slug));
for(const careerPath of CAREER_PATHS){
 for(const step of careerPath.steps){
  if(step.status!=="live")continue;
  const href=(step.href||"").split("#")[0];
  if(href.startsWith("/career/exams/"))assert(liveExamHrefs.has(href),"Only genuinely live paper: "+href);
  else if(href.startsWith("/career/guides/"))assert(liveGuideHrefs.has(href),"Only genuinely live guide: "+href);
  else if(href.startsWith("/career/interviews/"))assert(liveInterviewHrefs.has(href),"Only genuinely live interview: "+href);
  else if(href.startsWith("/skill-labs/books/"))assert(bookHrefs.has(href),"Only published tech book: "+href);
  else assert(fs.existsSync("src/app"+href+"/page.tsx"),"Missing runnable learning entry: "+href);
 }
}
const routeSource=fs.readFileSync("src/lib/career-paths.ts","utf8");
for(const secretImport of ["career-formal-bank","career-original-guides","career-interview-scenarios"]){
 assert(!routeSource.includes('from "./'+secretImport+'"'),"Client path registry must not import full server content: "+secretImport);
}

assert.equal(CAREER_PATHS.length,4);
assert.equal(careerPathForRole("intelligence-01-04")?.slug,"ai-agent-engineer");
assert.equal(careerPathForRole("intelligence-02-01")?.slug,"data-analyst-sql");
assert.equal(careerPathForRole("product-ops-02-01")?.slug,"commerce-operations");
assert.equal(careerPathForRole("digital-01-02")?.slug,"software-engineer");
assert.equal(careerPathForRole("construction-01-01"),undefined,"Do not invent products for unverified roles");
const rolePage=fs.readFileSync("src/app/career/roles/[id]/page.tsx","utf8");
assert(rolePage.includes("notFound()")&&rolePage.includes("getCareerRole(id)"));
assert(rolePage.includes("careerPathForRole"),"Role pages must use single source of verified career tracks");
assert(rolePage.includes("EXACT_PRODUCTS"),"role pages only associate content by explicitly verified training tracks");
assert(rolePage.includes("这个具体岗位的专项资料尚未上线"),"no false products for merely listed occupations");
const home=fs.readFileSync("src/app/career/page.tsx","utf8");
const nav=fs.readFileSync("src/components/CareerRoleExplorer.tsx","utf8");
assert(home.indexOf("commercialHero")<home.indexOf("<CareerRoleExplorer/>"));
assert(home.includes("mobileQuickActions"),"mobile first screen must expose role choice and practice");
assert(home.indexOf("<CareerRoleExplorer/>")<home.indexOf('id="digital-materials"'),"Role choice must precede any offers");
assert(home.indexOf("CareerRoleExplorer")<home.indexOf('id="market-heat"'));
assert(home.indexOf('id="digital-materials"')<home.indexOf("researchDetails"));
for(const label of ["查看岗位方向","查看正式模拟与面试","先找到要准备的岗位","岗位模拟笔试与面试"]){
  assert(home.includes(label),"missing primary CTA:"+label);
}
assert(nav.includes("CAREER_PATHS.map"),"Prioritize verified training routes before raw job names");
assert(nav.includes("CAREER_ROLE_GROUPS.map"),"category navigation must be functional");
assert(nav.includes("onClick={()=>setCategory(group.id)}"),"category controls must update list");
assert(nav.includes('href={"/career/roles/"+role.id}'),"every role is clickable");
assert(!nav.includes("假招聘")&&!nav.includes("在招 270"));
console.log("CAREER_COMMERCIAL_DIRECTORY=PASS industries=13 roles=270 real_guides=3 real_exams=4 role_first=YES research_collapsed=YES");
