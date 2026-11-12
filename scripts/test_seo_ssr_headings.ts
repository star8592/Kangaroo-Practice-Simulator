import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Source-level SSR fallback contract: all six client-only exercise runners
 * render one meaningful H1 before hydration, while preserving the interactive
 * H1 after hydration. The server may not access sessionStorage at render time.
 * This is deliberately a static regression guard; live HTML must be checked
 * again after deploying the Next.js bundle.
 */
const cases: Array<{file:string;expected:string;pages:string[]}> = [
  {file:"src/components/CareerFormalExamRunner.tsx",expected:"{paper.title}",pages:["src/app/career/exams/[id]/page.tsx"]},
  {file:"src/components/CodeLabClient.tsx",expected:"{track?.name??",pages:["src/app/skill-labs/code-lab/page.tsx","src/app/skill-labs/engineering/[track]/page.tsx"]},
  {file:"src/components/EngineeringCodeExamClient.tsx",expected:"软件工程岗位 · 综合编程模拟笔试",pages:["src/app/skill-labs/engineering-mock/page.tsx"]},
  {file:"src/components/AdvancedReasoningRunner.tsx",expected:"高级逻辑与批判性推理 · 40题",pages:["src/app/assessment-center/advanced-reasoning-40/page.tsx"]},
  {file:"src/components/CareerAptitudeRunner.tsx",expected:"招聘通用能力 · 40题",pages:["src/app/assessment-center/career-aptitude-40/page.tsx"]},
  {file:"src/components/CareerInterviewClient.tsx",expected:"{profile.title}",pages:["src/app/career/interviews/[id]/page.tsx"]},
];
let routeCount = 0;
for(const item of cases){
  const code = fs.readFileSync(path.resolve(item.file),"utf8");
  const start=code.lastIndexOf("if(!hydrated)return");
  assert.ok(start >= 0,item.file+": SSR fallback missing");
  const next=code.indexOf(";\n",start);
  assert.ok(next > start,item.file+": SSR fallback boundary missing");
  const fallback=code.slice(start,next);
  assert.ok(fallback.includes("<h1>")&&fallback.includes("</h1>"),item.file+": SSR H1 missing");
  assert.ok(fallback.includes(item.expected),item.file+": SSR H1 inconsistent with hydrated title");
  assert.ok(code.slice(next).includes("<h1>"),item.file+": hydrated H1 accidentally removed");
  assert.ok(!fallback.includes("sessionStorage"),item.file+": forbidden browser data in SSR fallback");
  for(const page of item.pages){
    assert.ok(fs.existsSync(page),page+": route missing");
    const source=fs.readFileSync(page,"utf8");
    const component=path.basename(item.file,".tsx");
    assert.ok(source.includes(component),page+": expected runner missing");
    routeCount++;
  }
}
console.log("SEO_SSR_HEADINGS_CONTRACT=PASS client_runners="+cases.length+" route_templates="+routeCount+" observed_live_failures=14");
