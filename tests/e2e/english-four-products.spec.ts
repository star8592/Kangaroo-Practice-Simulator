import {expect,test} from "@playwright/test";

const STUDIOS=[
 {slug:"pronunciation",title:"发音训练",target:"https://toktik.tech/accent-lab/practice-library"},
 {slug:"vocabulary",title:"单词学习",target:"https://toktik.tech/vocab/"},
 {slug:"reading",title:"英语阅读",target:null},
 {slug:"aelos",title:"综合英语",target:"https://toktik.tech/english/home"},
] as const;

test("homepage opens a single English hub containing four independent products",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("navigation",{name:"学习与考试分类"}).locator('a[href="/english"]')).toBeVisible();
 await page.getByRole("navigation",{name:"学习与考试分类"}).locator('a[href="/english"]').click();
 await expect(page).toHaveURL(/\/english$/);
 await expect(page.getByRole("heading",{level:1,name:"英语学习"})).toBeVisible();
 const nav=page.getByRole("navigation",{name:"英语四个独立学习项目"});
 await expect(nav.locator("article")).toHaveCount(4);
 for(const studio of STUDIOS)
  await expect(nav.locator('a[href="/english/'+studio.slug+'"]')).toBeVisible();
 await expect(page.locator("main")).not.toContainText(/立即购买|付款成功|会员已开通/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("each studio page is live, correctly labeled and truthful about independent login",async({page})=>{
 for(const studio of STUDIOS){
  const res=await page.goto("/english/"+studio.slug,{waitUntil:"domcontentloaded"});
  expect(res?.status(),"Studio "+studio.slug).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:studio.title})).toBeVisible();
  await expect(page.locator('nav[aria-label="英语学习路径"] a[href="/english"]')).toBeVisible();
  await expect(page.locator(`a[href="/login?next=${encodeURIComponent("/english/"+studio.slug)}"]`)).toBeVisible();
  const target=page.locator("main .ignored, main a[href^='https://toktik.tech/']");
  if(studio.target){
    await expect(target).toHaveCount(1);
    await expect(target).toHaveAttribute("href",studio.target);
    await expect(page.locator("main")).toContainText("不会自动与本站互通");
  }else{
    await expect(target).toHaveCount(0);
    await expect(page.locator("main")).toContainText("暂未开放");
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 }
});

test("English hub and each studio route expose canonical SEO URL",async({page})=>{
 for(const route of ["/english",...STUDIOS.map(s=>"/english/"+s.slug)]){
  await page.goto(route);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href","https://socthink.cn"+route);
 }
});
