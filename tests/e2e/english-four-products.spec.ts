import {expect,test} from "@playwright/test";

const STUDIOS=[
 {slug:"pronunciation",title:"发音训练",target:"/english/pronunciation/app/practice-library"},
 {slug:"vocabulary",title:"单词学习",target:"/english/vocabulary/app/"},
 {slug:"reading",title:"英语阅读",target:"/english/reading/app/"},
 {slug:"aelos",title:"高阶阅读",target:"/english/aelos/app/library"},
] as const;

test("homepage English hub exposes six direct entries in four independent apps",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("navigation",{name:"学习与考试分类"}).locator('a[href="/english"]')).toBeVisible();
 await page.getByRole("navigation",{name:"学习与考试分类"}).locator('a[href="/english"]').click();
 await expect(page).toHaveURL(/\/english$/);
 await expect(page.getByRole("heading",{level:1,name:"英语学习"})).toBeVisible();
 const nav=page.getByRole("navigation",{name:"英语学习直达入口"});
 await expect(nav.locator("article")).toHaveCount(6);
 const direct=[
  {title:"发音训练",target:"/english/pronunciation/app/practice-library"},
  {title:"单词学习",target:"/english/vocabulary/app/"},
  {title:"少儿英语绘本",target:"/english/reading/kids/"},
  {title:"英语阅读",target:"/english/reading/app/"},
  {title:"英语考试中心",target:"/english/reading/app/exams"},
  {title:"高阶阅读",target:"/english/aelos/app/library"},
 ];
 for(const entry of direct){
  const card=nav.locator("article.direct-entry-card").filter({has:page.getByRole("heading",{name:entry.title,exact:true})});
  await expect(card).toHaveCount(1);
  const primary=card.locator("a.direct-entry-hit");
  await expect(primary).toHaveAttribute("href",new RegExp("^"+entry.target.replace(/\/$/,"")+"\\/?$"));
 }
 await expect(nav).not.toContainText("进入目录");
 await expect(page.locator("main")).not.toContainText(/立即购买|付款成功|会员已开通/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});


test("English second-level title and icon themselves open the learning app",async({page})=>{
 for(const selected of [
  {title:"发音训练",target:"/english/pronunciation/app/practice-library",click:"heading"},
  {title:"少儿英语绘本",target:"/english/reading/kids/",click:"icon"},
  {title:"英语考试中心",target:"/english/reading/app/exams",click:"heading"},
 ]){
  await page.goto("/english");
  const card=page.locator("article.direct-entry-card").filter({has:page.getByRole("heading",{name:selected.title,exact:true})});
  await expect(card).toBeVisible();
  const target=selected.click==="heading"
   ?card.getByRole("heading",{name:selected.title,exact:true})
   :card.locator('[aria-hidden="true"]').first();
  await target.scrollIntoViewIfNeeded();
  const rect=await target.boundingBox();
  expect(rect).not.toBeNull();
  await page.mouse.click(rect!.x+rect!.width/2,rect!.y+rect!.height/2);
  await expect(page).toHaveURL(new RegExp(selected.target.replace(/\/$/,"")+"\\/?$"));
 }
});

test("each studio page is live, correctly labeled and truthful about independent login",async({page})=>{
 for(const studio of STUDIOS){
  const res=await page.goto("/english/"+studio.slug,{waitUntil:"domcontentloaded"});
  expect(res?.status(),"Studio "+studio.slug).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:studio.title})).toBeVisible();
  await expect(page.locator('nav[aria-label="英语学习路径"] a[href="/english"]')).toBeVisible();
  await expect(page.locator(`a[href="/login?next=${encodeURIComponent("/english/"+studio.slug)}"]`)).toBeVisible();
  const target=page.locator('main a[href="'+studio.target+'"]');
  await expect(target).toHaveCount(1);
  await expect(target).toHaveAttribute("href",studio.target);
  await expect(page.locator("main a[href^='https://toktik.tech/']")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("尚未完成端到端验收");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 }
});

test("English hub and each studio route expose canonical SEO URL",async({page})=>{
 for(const route of ["/english",...STUDIOS.map(s=>"/english/"+s.slug)]){
  await page.goto(route);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href","https://socthink.cn"+route);
 }
});
