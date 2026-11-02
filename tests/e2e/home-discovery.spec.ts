import {test,expect} from "@playwright/test";

test("homepage contains live updates, real routes and seven secondary exam categories",async({page})=>{
 const res=await page.goto("/");
 expect(res?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:/从一份试卷|From a practice paper/})).toBeVisible();
 const main=page.locator("main");
 await expect(main.getByRole("heading",{name:"最近更新"})).toBeVisible();
 const updates=main.locator("time[datetime]");
 expect(await updates.count()).toBeGreaterThanOrEqual(5);
 const dates=await updates.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("datetime")||""));
 expect(dates).toEqual([...dates].sort().reverse());
 for(const href of ["/career","/skill-labs","/skill-labs/books","/assessment-center","/shop","/exam-planner"]){
  await expect(main.locator('a[href="'+href+'"]').first()).toBeVisible();
 }
 await expect(main.locator('a[href^="/assessments#domain-"]')).toHaveCount(7);
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
 await page.goto("/search?q=zzzznoresult2026");
 await expect(page.getByText(/暂时没有匹配的已开放内容/)).toBeVisible();
});

test("the new public navigation exposes actual business hubs without duplicating taxonomy",async({page})=>{
 await page.goto("/");
 const width=page.viewportSize()!.width;
 if(width<1180)await page.getByRole("button",{name:"打开导航菜单"}).click();
 const nav=page.getByRole("navigation",{name:width<1180?"移动端导航":"主要导航"});
 for(const label of ["全部考试","真题资料","职业岗位","技能实训","测评中心","数字商城","考试管理"])
  await expect(nav.getByRole("link",{name:label,exact:true})).toBeVisible();
 if(width<1180){
  await expect(nav.getByRole("link",{name:"购买与权益"})).toBeVisible();
  await expect(nav.locator('a[href^="/assessments#domain-"]')).toHaveCount(0);
 }
});
