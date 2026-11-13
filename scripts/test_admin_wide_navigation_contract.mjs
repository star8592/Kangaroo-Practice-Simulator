import assert from "node:assert/strict";
import fs from "node:fs";
const read = p => fs.readFileSync(p,"utf8");
const nav = read("src/components/AdminOperationsNav.tsx");
const navCss = read("src/components/AdminOperations.module.css");
const globalCss = read("src/app/globals.css");
const executiveCss = read("src/app/admin/executive.module.css");

const routes=[
  "/admin","/admin/families","/admin/students","/admin/classroom",
  "/admin/questions","/admin/competition-source-watch","/admin/feedback","/admin/seo",
];
for(const route of routes) {
  assert.ok(nav.includes('href: "'+route+'"'),"missing navigation route: "+route);
}
for(const label of ["总览","用户与教学","内容与服务","增长分析"]) {
  assert.ok(nav.includes(label),"missing navigation category: "+label);
}
assert.match(nav,/aria-current=\{active \? "page"/);
assert.match(nav,/aria-expanded=\{open\}/);
assert.match(nav,/usePathname\(\)/);
assert.match(nav,/setOpen\(false\)/);
assert.match(navCss,/\.sidebar\{position:fixed/);
assert.match(navCss,/@media\(max-width:1100px\)/);
assert.match(navCss,/\.sidebar\{position:sticky/);
assert.match(navCss,/\.navGroupsOpen\{display:block\}/);
assert.match(navCss,/@media\(max-width:620px\)/);
assert.match(navCss,/\.sidebar a:focus-visible/);
assert.match(globalCss,/--layout-wide:1920px;--layout-focus:960px/);
assert.match(executiveCss,/\.shell\{max-width:2400px;padding:18px 28px 76px 278px\}/);
const pageNav = [
 "src/app/admin/page.tsx",
 "src/app/admin/classroom/page.tsx",
 "src/app/admin/seo/page.tsx",
 "src/app/admin/families/page.tsx",
 "src/app/admin/feedback/page.tsx",
 "src/components/AdminStudents.tsx",
 "src/components/AdminQuestions.tsx",
 "src/components/SourceReviewDashboard.tsx",
 "src/app/admin/students/[id]/page.tsx",
];
for (const file of pageNav) {
  assert.match(read(file),/AdminOperationsNav/,file+" lost sidebar");
}
for(const file of [
  "src/components/AdminStudents.tsx","src/components/AdminQuestions.tsx",
  "src/components/SourceReviewDashboard.tsx","src/app/admin/students/[id]/page.tsx",
]) {
  assert.match(read(file),/admin-review-shell/,file+" lost wide layout");
}
for(const file of ["src/app/admin/classroom/classroom.module.css","src/app/admin/seo/seo.module.css"]) {
  assert.match(read(file),/max-width:2400px/,file+" has old layout cap");
}
console.log("SOCTHINK_WIDE_ADMIN_NAV_CONTRACT_PASS routes=8 pages=9 breakpoints=3");
