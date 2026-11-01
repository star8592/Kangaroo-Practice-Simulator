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

test("seven exam category navigation labels stay four characters, on one line, and aligned",async({page})=>{
  const names=["校内升学","数学竞赛","语言考试","大学考研","职业技能","资格公考","人格测评"];
  for(const width of [390,768,960,1440]){
    await page.setViewportSize({width,height:860});
    await page.goto("/assessments");
    const nav=page.getByRole("navigation",{name:"考试分类"});
    const links=nav.locator('a[href^="/assessments#domain-"]');
    await expect(links).toHaveCount(7);
    const metrics=await links.evaluateAll(nodes=>nodes.map(node=>{
      const label=node.querySelector("strong")!;
      const count=node.querySelector("em")!;
      const number=node.querySelector("span")!;
      const a=label.getBoundingClientRect();
      return {
        label:label.textContent?.trim(),
        charCount:[...(label.textContent??"")].length,
        labelHeight:a.height,
        lineHeight:parseFloat(getComputedStyle(label).lineHeight)||parseFloat(getComputedStyle(label).fontSize)*1.5,
        numberLeft:number.getBoundingClientRect().left,
        countRight:count.getBoundingClientRect().right,
        countVisible:getComputedStyle(count).display!=="none",
        horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
      };
    }));
    expect(metrics.map(x=>x.label)).toEqual(names);
    for(const m of metrics){
      expect(m.charCount).toBe(4);
      expect(m.labelHeight,"Navigation label does not wrap").toBeLessThanOrEqual(m.lineHeight+1);
      expect(m.horizontalOverflow,"No viewport overflow").toBeLessThanOrEqual(2);
      if(width>760)expect(m.countVisible).toBe(true);
    }
    if(width>760){
      const first=metrics[0];
      for(const m of metrics){
        expect(Math.abs(m.numberLeft-first.numberLeft),"All category numbers align").toBeLessThanOrEqual(1);
        expect(Math.abs(m.countRight-first.countRight),"All topic counts align").toBeLessThanOrEqual(1);
      }
    }
  }
  await page.goto("/");
  await expect(page.getByRole("link",{name:/人格测评/}).first()).toBeVisible();
  await page.goto("/assessments?q=人格测评");
  const directory=page.getByRole("region",{name:"考试目录"});
  await expect(directory.locator("article")).toHaveCount(1);
  await expect(directory.locator("article").getByRole("heading",{name:"人格、职业兴趣与能力探索"})).toBeVisible();
});
