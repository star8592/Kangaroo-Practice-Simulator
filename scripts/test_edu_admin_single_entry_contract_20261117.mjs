import assert from "node:assert/strict";
import fs from "node:fs";
const r=p=>fs.readFileSync(p,"utf8");
const pages=[
 ["src/app/admin/page.tsx","/login?next=%2Fadmin"],
 ["src/app/admin/classroom/page.tsx","/login?next=%2Fadmin%2Fclassroom"],
 ["src/app/admin/users/page.tsx","/login?next=%2Fadmin%2Fusers"],
];
for(const [p,target] of pages){
 const code=r(p);
 assert(code.includes(target),p+" does not use unified WeChat login");
 assert(code.includes('redirect("/workspace")'),p+" must not loop authenticated non-owner into login");
}
const classroom=r("src/app/admin/classroom/page.tsx");
assert(classroom.includes("initialSubject={initialSubject}"));
const directory=r("src/app/admin/users/page.tsx");
assert(directory.includes("/admin/classroom?subject="));
assert(directory.includes("管理模块入口"));
assert(directory.includes("英语课堂任课"));
const client=r("src/app/admin/classroom/ClassroomAdminClient.tsx");
assert(client.includes("/admin/users?subject="));
assert(client.includes("sourceLookup"));
assert(client.includes("英语跟读 · 实际任课授权"));
const teacher=r("src/app/english/teacher/page.tsx");
assert(teacher.includes('redirect("/workspace")'));
const side=r("src/components/AdminOperationsNav.tsx");
assert(side.includes('label: "模块入口权限"'));
assert(!side.includes('label: "教师与模块授权"'));
const platform=r("src/app/admin/platform-authorizations/page.tsx");
assert(platform.includes("模块工作台入口权限"));
assert(platform.includes("英语跟读任课"));
console.log("SOCTHINK_EDU_ADMIN_SINGLE_ENTRY_CONTRACT_PASS=13");
