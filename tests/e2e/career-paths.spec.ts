import {expect,test} from "@playwright/test";

test("career homepage puts verifiable role routes ahead of the broad directory",async({page})=>{
 const res=await page.goto("/career");
 expect(res?.status()).toBe(200);
 const featured=page.getByRole("region",{name:"已经开放的岗位学习路线"});
 await expect(featured).toBeVisible();
 await expect(featured.locator("article")).toHaveCount(4);
 await featured.getByRole("link",{name:/查看校招／社招学习路线/}).first().click();
 await expect(page).toHaveURL(/\/career\/paths\/ai-agent-engineer$/);
 await expect(page.getByRole("heading",{level:1,name:"AI Agent 应用工程"})).toBeVisible();
 await expect(page.locator('a[href="/skill-labs/agent-foundations"]').first()).toBeVisible();
 await expect(page.locator('a[href="/career/exams/agent-engineering-paper-2026q4-v1"]')).toBeVisible();
 await page.getByText("查看原始资料与技术依据").click();
 await expect(page.locator('a[href="https://github.com/karpathy/micrograd"]')).toBeVisible();
});

test("student or experienced candidate can see real gaps without fake purchases",async({page})=>{
 await page.goto("/career/paths/data-analyst-sql?audience=social");
 await expect(page.getByRole("heading",{level:1,name:"数据分析与 SQL 实训"})).toBeVisible();
 await expect(page.getByRole("link",{name:/社招 \/ 转岗/})).toHaveAttribute("aria-current","page");
 await expect(page.getByRole("link",{name:/浏览器 SQL 真执行训练/})).toHaveCount(0);
 await expect(page.locator('a[href="/skill-labs/sql-lab"]').first()).toBeVisible();
 await expect(page.getByText("数据分析岗位完整专业模拟卷")).toBeVisible();
 const planned=page.locator("li").filter({hasText:"数据分析岗位完整专业模拟卷"});
 await expect(planned.getByText("尚未上线")).toBeVisible();
 await expect(planned.getByRole("link")).toHaveCount(0);
 await expect(page.locator("main")).toHaveCount(1);
});

test("real formal mock and role pages are connected in both directions",async({page})=>{
 await page.goto("/career/roles/product-ops-02-01");
 await expect(page.getByRole("heading",{level:1,name:"商品运营专员"})).toBeVisible();
 await expect(page.getByRole("link",{name:/进入岗位学习路线/})).toBeVisible();
 await page.getByRole("link",{name:/进入岗位学习路线/}).click();
 await expect(page).toHaveURL(/\/career\/paths\/commerce-operations$/);
 await expect(page.locator('a[href="/career/guides/retail-campaign-roi-handbook"]').first()).toBeVisible();
 await expect(page.locator('a[href="/career/exams/operations-paper-2026q4-v1"]')).toBeVisible();
 await page.locator('a[href="/career/exams/operations-paper-2026q4-v1"]').click();
 await expect(page.getByRole("button",{name:"确认入场 · 开始模拟笔试"})).toBeVisible();
});

test("career index includes only published route pages, not private classroom",async({request})=>{
 const [sitemap,math]=await Promise.all([request.get("/sitemap.xml"),request.get("/math")]);
 expect(sitemap.status()).toBe(200);
 const xml=await sitemap.text();
 for(const href of ["/career/paths","/career/paths/ai-agent-engineer","/career/paths/data-analyst-sql","/career/paths/commerce-operations","/career/paths/software-engineer"])
  expect(xml).toContain("<loc>https://socthink.cn"+href+"</loc>");
 expect(xml).not.toContain("<loc>https://socthink.cn/math</loc>");
 expect(math.status()).toBe(200);
 expect(await math.text()).toContain("noindex");
});
