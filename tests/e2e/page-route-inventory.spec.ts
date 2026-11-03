import {expect,test} from "@playwright/test";

test("every primary business hub remains discoverable under one main landmark",async({page})=>{
 for(const route of ["/assessments","/resources","/career","/skill-labs","/assessment-center","/shop"]){
  await page.goto(route);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main h1").first()).toBeVisible();
 }
});

test("a math verification evidence page is reachable from the exam business",async({page})=>{
 await page.goto("/assessments");
 await page.getByRole("link",{name:"分年级数学计算指南"}).click();
 await expect(page).toHaveURL(/\/math-practice$/);
 await page.getByRole("link",{name:"数学题形式化验证档案"}).click();
 await expect(page).toHaveURL(/\/verification$/);
 await expect(page.getByRole("heading",{name:"数学验证中心"})).toBeVisible();
 await expect(page.getByRole("navigation",{name:"当前位置"}).locator('a[href="/math-practice"]')).toBeVisible();
 await expect(page.locator("main")).toHaveCount(1);
});

test("employer research belongs to careers rather than school exams",async({page})=>{
 await page.goto("/career");
 await page.locator('a[href="/career/companies"]').first().click();
 await expect(page).toHaveURL(/\/career\/companies$/);
 const crumb=page.getByRole("navigation",{name:"位置"});
 await expect(crumb.locator('a[href="/career"]')).toBeVisible();
 await expect(crumb.locator('a[href="/assessments"]')).toHaveCount(0);
 await expect(page.locator("main")).toHaveCount(1);
});

test("sitemap discovers public owner pages without indexing private account routes",async({request})=>{
 const response=await request.get("/sitemap.xml");
 expect(response.status()).toBe(200);
 const xml=await response.text();
 for(const url of ["/assessment-center","/assessment-center/methodology",
   "/career/companies","/career/interviews","/verification"]){
  expect(xml).toContain("<loc>https://socthink.cn"+url+"</loc>");
 }
 for(const path of ["/admin","/account","/student","/result"]){
  expect(xml).not.toContain("<loc>https://socthink.cn"+path+"</loc>");
 }
});

test("legacy WebGPU static HTML redirects to its canonical skill course",async({page,request})=>{
 const response=await request.get("/skill-labs/webgpu-basics/index.html");
 expect(response.status()).toBe(200);
 const html=await response.text();
 expect(html).toContain('name="robots" content="noindex,follow"');
 expect(html).toContain('rel="canonical" href="https://socthink.cn/skill-labs/webgpu-basics"');
 expect(html).not.toContain('src="/src/main.js"');
 await page.goto("/skill-labs/webgpu-basics/index.html");
 await expect(page).toHaveURL(/\/skill-labs\/webgpu-basics$/);
 await expect(page.locator("main h1").first()).toBeVisible();
});
