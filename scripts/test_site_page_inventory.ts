/**
 * SOC THINK page-inventory invariant. Reads real Next.js route files, not a
 * second manually maintained router. The inventory document is a reviewed
 * audit trail, never a routing, authentication or product source of truth.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {businessForPublicPath,PRIMARY_BUSINESS_NAV} from "../src/lib/site-architecture";

const docPath="docs/architecture/SOCTHINK_PAGE_ROUTE_AUDIT.md";
const read=(p:string)=>fs.readFileSync(p,"utf8");
function findFiles(folder:string):string[]{
  return fs.readdirSync(folder,{withFileTypes:true}).flatMap(item=>{
    const p=path.posix.join(folder,item.name);
    return item.isDirectory()?findFiles(p):[p];
  });
}
const pages=findFiles("src/app").filter(p=>p.endsWith("/page.tsx")).sort();
const routeFromFile=(p:string)=>p.slice("src/app".length).replace(/\/page\.tsx$/,"")||"/";
const htmlFiles=findFiles("public").filter(p=>/\.html?$/.test(p)).sort();
const htmlRoutes=htmlFiles.map(p=>"/"+p.slice("public/".length));
const routes=[...pages.map(routeFromFile),...htmlRoutes];
const set=new Set(routes);
assert.equal(set.size,routes.length,"Duplicate Next.js page route");
const tick=String.fromCharCode(96);
type Row={route:string;owner:string;parent:string;mode:string;entry:string};
const rows:Row[]=[];
for(const raw of read(docPath).split(/\r?\n/)){
 if(!raw.startsWith("| "+tick+"/"))continue;
 const fields=raw.split("|").slice(1,-1).map(s=>s.trim().replaceAll(tick,""));
 assert.equal(fields.length,5,"Inventory must have five columns: "+raw);
 rows.push({route:fields[0],owner:fields[1],parent:fields[2],mode:fields[3],entry:fields[4]});
}
assert.equal(rows.length,routes.length,"Every real page must have exactly one inventory entry");
assert.deepEqual(rows.map(r=>r.route).sort(),[...routes].sort(),"New/deleted page requires inventory audit update");
const labels:Record<string,string>={exams:"全部考试",resources:"真题资料",
 career:"职业岗位",skills:"技能实训",practice:"求职训练",assessments:"测评中心",store:"数字商城",english:"英语学习"};
const byRoute=new Map(rows.map(r=>[r.route,r]));
const crossover=(route:string)=>{
 if(route==="/"||route==="/search")return "全站入口";
 if(route.startsWith("/admin"))return "管理后台";
 if(route==="/privacy"||route==="/terms"||route.startsWith("/digital-purchase-policy"))return "政策与权益";
 if(route==="/account"||route==="/login"||route==="/membership"||
    route.startsWith("/student")||route.startsWith("/parent"))return "账户与权益";
 return null;
};
let scoped=0,restricted=0;
for(const row of rows){
 assert.ok(row.owner&&row.parent&&row.mode&&row.entry,"Incomplete page inventory: "+row.route);
 assert.ok(set.has(row.route),"Invented route in inventory: "+row.route);
 if(row.parent!=="—")assert.ok(set.has(row.parent),"Parent page missing: "+row.route+" -> "+row.parent);
 const owner=row.route==="/assessment-center/sql-lab"?"技能实训":
  (businessForPublicPath(row.route)?labels[businessForPublicPath(row.route)!]:crossover(row.route));
 assert.equal(row.owner,owner,"Incorrect business ownership: "+row.route);
 // All routes must connect to "/" without a parent cycle, including legacy,
 // private and dynamic templates. This is hierarchy, not access permission.
 const seen=new Set<string>();
 let current=row.route;
 while(current!=="/"){
  assert.ok(!seen.has(current),"Cycle in page hierarchy: "+row.route);
  seen.add(current);
  const parent=byRoute.get(current)?.parent;
  assert.ok(parent&&parent!=="—","Broken parent chain: "+row.route+" -> "+current);
  current=parent;
 }
 if(row.owner==="管理后台"||row.owner==="账户与权益"||row.mode.includes("受控"))restricted++;
 else scoped++;
}
const layout=read("src/app/layout.tsx");
assert.equal((layout.match(/<main\b/g)||[]).length,1,"Root layout must own one main landmark");
for(const file of pages)assert.ok(!/<main\b/.test(read(file)),"Nested main on "+file);
for(const route of htmlRoutes){
 const content=read("public"+route);
 assert.ok(content.includes('name="robots"')&&content.includes("noindex"),"Static HTML must be excluded from indexing: "+route);
 assert.ok(content.includes('rel="canonical"'),"Static HTML lacks canonical: "+route);
 assert.ok(content.includes('href="/skill-labs/webgpu-basics"'),"Static HTML needs a usable owner link: "+route);
 assert.ok(!content.includes('src="/src/main.js"'),"Vite source must not be executed at a public static URL: "+route);
}
assert.ok(!/<main\b/.test(read("src/components/SourceReviewDashboard.tsx")),
  "Admin source-review component must not nest a main landmark");
const robots=read("src/app/robots.ts");
for(const privatePrefix of ["/admin","/student","/parent","/account","/report/","/result","/review","/login","/exam/","/arithmetic/print"]){
 assert.ok(robots.includes('"'+privatePrefix+'"'),"Missing robots privacy protection: "+privatePrefix);
}
// Public verification evidence must not be in the same robots disallow list.
assert.ok(!robots.includes('"/verification"'),
  "Indexable math verification page is blocked by robots.txt");
const shopIndex=read("src/app/shop/page.tsx");
const shopDetail=read("src/app/shop/[productId]/page.tsx");
assert.ok(read("src/app/digital-purchase-policy/v1/page.tsx").includes("index:false"),
  "Historical legal policy must not compete with current version in search");
assert.ok(shopIndex.includes('canonical:"/shop"'),"Shop index needs a stable canonical");
assert.ok(shopDetail.includes("generateMetadata")&&
  shopDetail.includes('canonical:"/shop/"+encodeURIComponent(product.id)'),
  "Each published store SKU must produce its own canonical");
const sitemap=read("src/app/sitemap.ts");
assert.ok(sitemap.includes("listStoreProducts")&&sitemap.includes("publishedProductPaths"),
  "Verified real storefront SKUs must participate in public sitemap");
for(const hub of ["/career","/learn","/practice","/career/companies"]){
 assert.ok(sitemap.includes('"'+hub+'"'),"Public quality page missing from sitemap: "+hub);
}
for(const privatePrefix of ["/admin","/student","/account","/parent","/report","/result"]){
 assert.ok(!sitemap.includes('"'+privatePrefix+'"'),"Sensitive root listed in sitemap: "+privatePrefix);
}
for(const business of PRIMARY_BUSINESS_NAV){
 assert.equal(byRoute.get(business.href)?.parent,"/","Primary navigation lacks home as parent");
}
assert.ok(read("src/app/math/page.tsx").includes("index:false"),
  "Classroom staging page must not be indexed on career website");
for(const mathHub of ["/assessments","/competitions","/resources","/math-practice","/events","/exam-planner"]){
 assert.ok(!sitemap.includes('"'+mathHub+'"'),"School math portal leaked into career sitemap: "+mathHub);
}

// Static reference audit: public concrete pages must be mentioned by some
// other application source, not merely by their own metadata or sitemap.
// A reference is discovery evidence, NOT proof that every dynamic instance
// renders an authorized clickable link; that needs browser/runtime testing.
const codeSources=findFiles("src").filter(p=>/\.(ts|tsx)$/.test(p)&&
 !p.endsWith("/sitemap.ts")&&!p.endsWith("/robots.ts"));
const sourceTexts=codeSources.map(file=>({file,body:read(file)}));
const publicModes=new Set(["一级业务","公开目录","公开内容","公开指南",
 "公开工具","公开政策","公开证据"]);
const unreachable:string[]=[];
let publicReferenced=0;
for(const row of rows){
 if(!publicModes.has(row.mode)||row.route==="/")continue;
 const own="src/app"+row.route+"/page.tsx";
 const patterns=['"'+row.route+'"',"'"+row.route+"'"];
 const referenced=sourceTexts.some(src=>src.file!==own&&
   patterns.some(pattern=>src.body.includes(pattern)));
 if(!referenced)unreachable.push(row.route);
 else publicReferenced++;
}
assert.deepEqual(unreachable,[],"Public route with no static discovery reference");

const proof=[
 ["src/components/AdminOperationsNav.tsx",'href: "/admin/competition-source-watch"'],
 ["src/app/math-practice/page.tsx",'href="/verification"'],
 ["src/components/ExamDirectory.tsx",'href="/math-practice"'],
 ["src/app/verification/page.tsx",'href="/math-practice"'],
 ["src/app/career/companies/page.tsx",'href="/career"'],
 ["src/app/assessment-center/about/page.tsx",'href="/assessment-center"'],
 ["src/components/SiteFooter.tsx",'href:"/account"'],
 ["src/components/AssessmentPortalClient.tsx",'href="/exam-planner"'],
];
for(const [p,needle] of proof)assert.ok(read(p).includes(needle),"Missing actual inbound/parent evidence: "+p+" "+needle);
// Grouped admin navigation is now data-driven. It must still turn that
// configuration into a real Next Link, rather than merely naming the route.
assert.ok(read("src/components/AdminOperationsNav.tsx").includes("href={link.href}"),
  "Admin navigation route data is not rendered as real links");

assert.ok(!read("src/app/career/companies/page.tsx").includes('href="/assessments"'),
 "Employer research must not descend from exams");
assert.ok(read("src/app/assessment-center/sql-lab/page.tsx").includes('permanentRedirect("/skill-labs/sql-lab")'),
 "Legacy SQL link must return to its skill owner");
console.log("SITE_PAGE_INVENTORY=PASS templates="+routes.length+" next="+pages.length+" public_static_html="+htmlRoutes.length+" owned="+scoped+
 " restricted_or_controlled="+restricted+" parents=ACYCLIC public_backlinks="+publicReferenced+" private=EXCLUDED_FROM_SITEMAP");
