import {expect,test} from "@playwright/test";

const domains=[
  "school","math-competition","language","university",
  "career","professional","interest",
] as const;

test("desktop uses one concise task navigation and seven reachable categories",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/");
  const tasks=page.getByRole("navigation",{name:"主要导航"});
  const categories=page.locator('[aria-labelledby="exam-category-overview"]');
  await expect(tasks.getByRole("link",{name:"全部考试"})).toBeVisible();
  await expect(tasks.getByRole("link",{name:"真题资料"})).toBeVisible();
  await expect(tasks.getByRole("link",{name:"考试管理"})).toBeVisible();
  // A second sticky taxonomy strip would repeat the same navigation.
  await expect(page.locator("header nav[aria-label='考试分类']")).toHaveCount(0);
  await expect(categories.locator('a[href^="/assessments#domain-"]')).toHaveCount(7);
  for(const id of domains)
    await expect(categories.locator('a[href="/assessments#domain-'+id+'"]')).toBeVisible();
  const practice=tasks.getByRole("button",{name:/在线练习/});
  await expect(practice).toHaveAttribute("aria-expanded","false");
  await practice.click();
  await expect(practice).toHaveAttribute("aria-expanded","true");
  await expect(tasks.getByRole("link",{name:/计算与数学训练/})).toBeVisible();
  await expect(tasks.getByRole("link",{name:/国际数学竞赛模拟/})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(practice).toHaveAttribute("aria-expanded","false");
  await categories.locator('a[href="/assessments#domain-language"]').click();
  await expect(page).toHaveURL(/\/assessments#domain-language$/);
  await expect(page.locator('#domain-language').getByRole("heading",{name:"语言与国际考试"})).toBeVisible();
});

test("mobile menu reaches even not-yet-live domains without a hidden strip",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("button",{name:"打开导航菜单"}).click();
  const nav=page.getByRole("navigation",{name:"移动端导航"});
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link",{name:/真题资料/})).toBeVisible();
  await expect(nav.getByRole("link",{name:/计算与数学训练/})).toBeVisible();
  await expect(nav.getByRole("link",{name:"考试管理"})).toBeVisible();
  await expect(nav.locator('a[href^="/assessments#domain-"]')).toHaveCount(7);
  await nav.locator('a[href="/assessments#domain-professional"]').click();
  await expect(page).toHaveURL(/\/assessments#domain-professional$/);
  await expect(page.getByRole("button",{name:"打开导航菜单"})).toHaveAttribute("aria-expanded","false");
  await expect(page.locator('#domain-professional').getByRole("heading",{name:"职业资格与公职考试"})).toBeVisible();
});

test("customer-facing headings, primary actions and search stay legible",async({page})=>{
  for(const width of [390,768,1280,1440]){
    await page.setViewportSize({width,height:880});
    await page.goto("/");
    const metrics=await page.evaluate(()=>{
      const font=(selector:string)=>parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
      return {
        heroTitle:font("main h1"),
        primaryAction:font("main [class*='quickItem'] strong"),
        categoryTitle:font("main [class*='categoryCard'] strong"),
        searchInput:font('main input[name="q"]'),
        overflow:document.documentElement.scrollWidth-window.innerWidth,
      };
    });
    expect(metrics.heroTitle,`hero at ${width}px`).toBeGreaterThanOrEqual(28);
    expect(metrics.primaryAction,`user action at ${width}px`).toBeGreaterThanOrEqual(18);
    expect(metrics.categoryTitle,`category title at ${width}px`).toBeGreaterThanOrEqual(18);
    expect(metrics.searchInput,`search on touch devices at ${width}px`).toBeGreaterThanOrEqual(16);
    expect(metrics.overflow,`no horizontal overflow at ${width}px`).toBeLessThanOrEqual(2);
  }
});

test("switching a category after search clears filters and reveals that domain",async({page})=>{
  await page.goto("/assessments");
  const directory=page.getByRole("region",{name:"考试目录"});
  const groups=directory.locator("article");
  await directory.getByRole("searchbox").fill("SQL");
  await expect(groups).toHaveCount(1);
  await directory.getByRole("navigation",{name:"考试分类"})
    .locator('a[href="/assessments#domain-language"]').click();
  await expect(groups).toHaveCount(7);
  await expect(page).toHaveURL(/#domain-language$/);
  await expect(directory.locator("#domain-language").getByRole("heading",{name:"语言与国际考试"})).toBeVisible();
});
