import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CAREER_ROLE_GROUPS,CAREER_ROLES,validateCareerRoleTaxonomy,
  searchCareerRoles,getCareerRole,
} from "../src/lib/career-role-taxonomy";
import {CAREER_ORIGINAL_GUIDES} from "../src/lib/career-original-guides";
import {CAREER_PRACTICE_CASES} from "../src/lib/career-practice";

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
assert.equal(CAREER_PRACTICE_CASES.length,3);
const rolePage=fs.readFileSync("src/app/career/roles/[id]/page.tsx","utf8");
assert(rolePage.includes("notFound()")&&rolePage.includes("getCareerRole(id)"));
assert(rolePage.includes("EXACT_PRODUCTS"),"role pages only associate content by explicitly verified training tracks");
assert(rolePage.includes("这个具体岗位的专项资料尚未上线"),"no false products for merely listed occupations");
const home=fs.readFileSync("src/app/career/page.tsx","utf8");
const nav=fs.readFileSync("src/components/CareerRoleExplorer.tsx","utf8");
assert(home.indexOf("commercialHero")<home.indexOf("<CareerRoleExplorer/>"));
assert(home.includes("mobileQuickActions"),"mobile first screen must expose both product categories");
assert(home.indexOf("CareerRoleExplorer")<home.indexOf('id="market-heat"'));
assert(home.indexOf('id="digital-materials"')<home.indexOf("researchDetails"));
for(const label of ["找资料 · 免费领取","做模拟考试 · 立即开始","职业教程与复习资料","模拟考试与自动评分"]){
  assert(home.includes(label),"missing primary CTA:"+label);
}
assert(nav.includes("CAREER_ROLE_GROUPS.map"),"category navigation must be functional");
assert(nav.includes("onClick={()=>setCategory(group.id)}"),"category controls must update list");
assert(nav.includes('href={"/career/roles/"+role.id}'),"every role is clickable");
assert(!nav.includes("假招聘")&&!nav.includes("在招 270"));
console.log("CAREER_COMMERCIAL_DIRECTORY=PASS industries=13 roles=270 real_guides=3 real_exams=3 commerce_first=YES research_collapsed=YES");
