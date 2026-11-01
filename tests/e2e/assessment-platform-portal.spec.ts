import {test,expect} from "@playwright/test";

test("all seven exam domains have a real directory without fake purchasable tests",async({page})=>{
  const response=await page.request.get("/api/assessments/catalog");
  expect(response.status()).toBe(200);
  const catalog=await response.json() as {liveDomains:number;domains:{id:string;readiness:string;liveRoutes:{href:string}[]}[]};
  // Live count follows the actually published domain registry; a newly
  // available, tested career route must not be mistaken for a placeholder.
  expect(catalog.liveDomains).toBe(catalog.domains.filter(x=>x.readiness==="live").length);
  const career=catalog.domains.find(x=>x.id==="career");
  expect(career).toMatchObject({readiness:"live",liveRoutes:[{href:"/career"}]});
  const careerResponse=await page.request.get("/career");
  expect(careerResponse.status()).toBe(200);
  expect(catalog.domains).toHaveLength(7);
  expect(catalog.domains.filter(x=>x.readiness==="planned").every(x=>x.liveRoutes.length===0)).toBe(true);

  await page.goto("/assessments");
  await expect(page.getByRole("heading",{name:"考试、真题、资料与能力训练"})).toBeVisible();
  const directory=page.getByRole("region",{name:"全部考试，一站查找"});
  const groups=directory.locator("article");
  await expect(groups).toHaveCount(7);
  await expect(groups.filter({has:page.getByRole("heading",{name:"职业资格与公职考试"})})).toBeVisible();
  await expect(groups.filter({has:page.getByRole("heading",{name:"语言与国际考试"})})).toBeVisible();
  await expect(directory.getByRole("link",{name:/小学至高中计算训练/})).toBeVisible();
  await expect(directory.getByText("雅思 IELTS")).toBeVisible();
  expect(await directory.getByText("雅思 IELTS").locator("xpath=ancestor::a").count()).toBe(0);

  await directory.getByRole("searchbox").fill("SQL");
  await expect(groups).toHaveCount(1);
  await expect(groups.getByRole("heading",{name:"职业技能与岗位实操"})).toBeVisible();
  await directory.getByRole("searchbox").fill("袋鼠");
  await expect(groups).toHaveCount(1);
  await groups.getByRole("link",{name:/袋鼠数学/}).click();
  await expect(page).toHaveURL(/\/competitions/);
});

test("new portal offers real search, seven-domain navigation and working resources on desktop and mobile",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:/找考试，查资料，.*立即开练。/})).toBeVisible();
  const search=page.getByRole("searchbox",{name:"搜索考试"});
  await expect(search).toBeVisible();
  await search.fill("SQL");
  await expect(page.getByRole("heading",{name:"职业技能与岗位实操"})).toBeVisible();
  await expect(page.getByText("SQL 数据库实操")).toBeVisible();
  await search.fill("unmatched-synthetic-query-2391");
  await expect(page.getByText(/没有找到对应分类/)).toBeVisible();
  await page.getByRole("button",{name:"清空搜索"}).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button",{name:/全球数学竞赛/})).toBeVisible();
  const mobile=(page.viewportSize()?.width??1280)<=760;
  if(mobile)await page.getByRole("button",{name:"打开导航菜单"}).click();
  await expect(page.getByRole("link",{name:"真题资料"}).first()).toBeVisible();
  if(mobile)await page.getByRole("button",{name:"关闭导航菜单"}).click();
  await page.getByRole("link",{name:/可用试卷资料/}).first().click();
  await expect(page).toHaveURL(/\/resources/);
  await expect(page.getByRole("heading",{name:"找到真正能做的试卷"})).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect(page.getByLabel("全部竞赛").first()).toBeVisible();
  await page.getByRole("searchbox").fill("unlikely-synthetic-no-results-4592");
  await expect(page.getByText(/没有找到匹配的试卷/)).toBeVisible();
  await page.getByRole("button",{name:"清除条件"}).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
});

test("exam search works with JavaScript disabled (before hydration)",async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{
    const page=await context.newPage();
    await page.goto("/");
    const form=page.locator('form[action="/assessments"]');
    await expect(form.locator('input[name="q"]')).toBeVisible();
    await form.locator('input[name="q"]').fill("SQL");
    await form.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/assessments\?q=SQL/);
    await expect(page.getByText("SQL 数据库实操",{exact:true})).toBeVisible();
    await expect(page.getByText("雅思 IELTS",{exact:true})).toHaveCount(0);

    await page.goto("/assessments?q=%E9%9B%85%E6%80%9D");
    await expect(page.getByText("雅思 IELTS",{exact:true})).toBeVisible();
    await expect(page.getByText("SQL 数据库实操",{exact:true})).toHaveCount(0);

    const directoryForm=page.locator('form[action="/assessments"]');
    await directoryForm.locator('input[name="q"]').fill("SQL");
    await directoryForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/assessments\?q=SQL/);
    await expect(page.getByText("SQL 数据库实操",{exact:true})).toBeVisible();
  }finally{
    await context.close();
  }
});
