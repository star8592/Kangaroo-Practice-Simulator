import {test,expect} from "@playwright/test";

test("homepage is a concise six-category course and exam portal",async({page})=>{
 const res=await page.goto("/");
 expect(res?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:"今天想学什么？"})).toBeVisible();
 const main=page.locator("main");
 const nav=main.getByRole("navigation",{name:"学习与考试分类"});
 const cards=nav.locator("a");
 await expect(cards).toHaveCount(6);
 for(const href of ["/math","/resources","/learn","/assessment-center","/assessments"]){
  await expect(nav.locator('a[href="'+href+'"]')).toBeVisible();
 }
 await expect(nav.getByRole("link",{name:/数学/})).toContainText("国际竞赛");
 await expect(main.locator('a[href="/exam-planner"]')).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("global search links books, labs and career products without old exam-only routing",async({page})=>{
 const start=await page.goto("/");
 expect(start?.status()).toBe(200);
 await page.locator('main input[name="q"]').fill("Rust");
 await page.locator('main button[type="submit"]').click();
 await expect(page).toHaveURL(/\/search\?q=Rust$/);
 await expect(page.getByRole("link",{name:"The Rust Programming Language"})).toBeVisible();
 await page.goto("/search?q=Agent");
 const result=page.locator("main");
 await expect(result.locator('a[href="/skill-labs/agent-foundations"]').first()).toBeVisible();
 await expect(result.locator('a[href="/career/exams/agent-engineering-paper-2026q4-v1"]').first()).toBeVisible();
 await page.goto("/search?q=智能体开发工程师");
 await expect(page.locator('a[href="/career/roles/intelligence-01-04"]').first()).toBeVisible();
 await page.goto("/search?q=数学竞赛");
 await expect(page.locator('a[href="/assessments"]')).toHaveCount(0);
 await page.goto("/search?q=zzzznoresult2026");
 await expect(page.getByText(/暂时没有匹配的已开放内容/)).toBeVisible();
});

test("the portal header is compact while all six business cards remain reachable",async({page})=>{
 await page.goto("/");
 const header=page.getByRole("navigation",{name:"SOC THINK 导航"});
 for(const href of ["/math","/learn","/assessment-center"])
  await expect(header.locator('a[href="'+href+'"]')).toBeVisible();
 await expect(header.locator('a[href="/exam-planner"]')).toHaveCount(0);
 const directory=page.getByRole("navigation",{name:"学习与考试分类"});
 await expect(directory.locator('a[href="/assessments"]')).toBeVisible();
 await expect(directory.locator('a[href="/resources"]')).toBeVisible();
});
