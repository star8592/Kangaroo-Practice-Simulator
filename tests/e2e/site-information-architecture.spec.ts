import {expect,test} from "@playwright/test";

const domains=[
  "school","math-competition","language","university",
  "career","professional","interest",
] as const;

test("desktop navigation separates five tasks and all seven exam categories",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/");
  const tasks=page.getByRole("navigation",{name:"主要导航"});
  const taxonomy=page.getByRole("navigation",{name:"考试分类"});
  await expect(tasks.getByRole("link",{name:"全部考试"})).toBeVisible();
  await expect(tasks.getByRole("link",{name:"真题资料"})).toBeVisible();
  await expect(tasks.getByRole("link",{name:"数学赛事"})).toBeVisible();
  await expect(taxonomy.getByRole("link")).toHaveCount(7);
  for(const id of domains)await expect(taxonomy.locator(`a[href="/assessments#domain-${id}"]`)).toBeVisible();

  const practice=tasks.getByRole("button",{name:/在线练习/});
  await expect(practice).toHaveAttribute("aria-expanded","false");
  await practice.click();
  await expect(practice).toHaveAttribute("aria-expanded","true");
  await expect(tasks.getByRole("link",{name:/计算与数学训练/})).toBeVisible();
  await expect(tasks.getByRole("link",{name:/国际数学竞赛模拟/})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(practice).toHaveAttribute("aria-expanded","false");

  await taxonomy.locator('a[href="/assessments#domain-language"]').click();
  await expect(page).toHaveURL(/\/assessments#domain-language$/);
  await expect(page.getByRole("heading",{name:"语言与国际考试",exact:true}).first()).toBeVisible();
});

test("mobile menu exposes all categories without hidden horizontal strips",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("button",{name:"打开导航菜单"}).click();
  const nav=page.getByRole("navigation",{name:"移动端导航"});
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link",{name:/真题资料/})).toBeVisible();
  await expect(nav.getByRole("link",{name:/计算与数学训练/})).toBeVisible();
  await expect(nav.locator('a[href^="/assessments#domain-"]')).toHaveCount(7);
  await nav.locator('a[href="/assessments#domain-professional"]').click();
  await expect(page).toHaveURL(/\/assessments#domain-professional$/);
  await expect(page.getByRole("button",{name:"打开导航菜单"})).toHaveAttribute("aria-expanded","false");
  await expect(page.getByRole("heading",{name:"职业资格与公职考试",exact:true}).first()).toBeVisible();
});

test("primary text is readable at desktop and phone widths",async({page})=>{
  for(const width of [390,768,1280,1440]){
    await page.setViewportSize({width,height:880});
    await page.goto("/");
    const metrics=await page.evaluate(()=>{
      const css=(selector:string)=>parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
      return {
        heroBody:css("main p"),
        categoryTitle:css("main [class*='categoryCard'] strong"),
        searchInput:css('main input[name="q"]'),
        overflow:document.documentElement.scrollWidth-window.innerWidth,
      };
    });
    expect(metrics.heroBody,`hero supporting text at ${width}px`).toBeGreaterThanOrEqual(15);
    expect(metrics.categoryTitle,`category heading at ${width}px`).toBeGreaterThanOrEqual(18);
    expect(metrics.searchInput,`search font on touch devices at ${width}px`).toBeGreaterThanOrEqual(16);
    expect(metrics.overflow,`no horizontal overflow at ${width}px`).toBeLessThanOrEqual(2);
  }
});
