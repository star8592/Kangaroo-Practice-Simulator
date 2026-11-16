'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const portal=read('src/components/SocthinkPortal.tsx');
const css=read('src/components/SocthinkPortal.module.css');
const header=read('src/components/SiteHeader.tsx');
const footer=read('src/components/SiteFooter.tsx');
const teacher=read('src/app/teach/page.tsx');
const subjects=read('src/app/subjects/page.tsx');
const learner=read('src/app/my/learning/page.tsx');
const workbench=read('src/app/workspace/page.tsx');
const paperSearch=read('src/app/resources/page.tsx');
const robots=read('src/app/robots.ts');
const sitemap=read('src/app/sitemap.ts');
const inventory=read('docs/architecture/SOCTHINK_PAGE_ROUTE_AUDIT.md');
for(const id of ['learner','teacher','organization'])
 assert(portal.includes('id:"'+id+'"'),'Missing persona '+id);
for(const href of ['/my/learning','/teach','/teach#organizations'])
 assert(portal.includes('href:"'+href+'"'),'Missing persona journey '+href);
for(const [id,href] of [['math','/math'],['english','/english'],['k12','/subjects'],['career','/learn'],['assessment','/assessment-center'],['exams','/assessments']])
 assert(portal.includes('id:"'+id+'"')&&portal.includes('href:"'+href+'"'),id);
assert.match(portal,/id="learning-catalog"/);
assert.match(css,/\.audienceGrid/);
assert.match(css,/@media\(max-width:760px\)/);
assert.match(header,/SITE_PORTAL_NAV/);
assert.match(read("src/lib/site-architecture.ts"),/href:"\/subjects"/);
assert.match(footer,/SITE_PORTAL_NAV/);
for(const id of ['teach','subjects']){
 const f=read('src/app/'+id+'/page.tsx');
 assert.match(f,/export const metadata/);
 assert(f.includes('canonical:"/'+id+'"'));
 assert.equal((f.match(/<h1>/g)||[]).length,1);
 assert(sitemap.includes('"/'+id+'"'));
}
assert.match(teacher,/href="\/workspace"/);
assert.match(teacher,/id="organizations"/);
assert.doesNotMatch(teacher,/教师申请表|立即购买学校套餐/);
for(const href of ['/math','/english','/resources','/assessments'])
 assert(subjects.includes('href:"'+href+'"'));
assert(paperSearch.includes('试卷资料检索与在线练习'));
assert.match(learner,/parentFromSessionToken/);
assert.match(learner,/redirect\("\/login\?next=%2Fmy%2Flearning"\)/);
assert.match(learner,/index:false/);
assert(robots.includes('"/my/"'));
assert(!sitemap.includes('"/my/learning"'));
assert.match(workbench,/myAuthorizedModules/);
assert.match(workbench,/parentFromSessionToken/);
assert(inventory.includes('| `/subjects` |'));
assert(inventory.includes('| `/teach` |'));
assert(inventory.includes('| `/my/learning` |'));
console.log('SOCTHINK_KHAN_PLATFORM_R1_CONTRACT_PASS=1 personas=3 subjects=6 protected_center=true');
