import {expect,test,type Page} from "@playwright/test";

/**
 * WebKit tablet/mobile smoke tests. This uses a patched WebKit engine and
 * emulated viewports, not physical iPadOS Safari. Real iPad signoff is separate.
 * The tests are read-only except guest-session establishment on /arithmetic.
 */
async function expectViewportFits(page:Page,route:string){
  await expect.poll(async()=>page.evaluate(()=>{
    const root=document.documentElement;
    const body=document.body;
    return {
      width:root.clientWidth,
      scroll:Math.max(root.scrollWidth,body.scrollWidth),
      visual:window.visualViewport?.width||root.clientWidth,
    };
  }),{timeout:8000}).toMatchObject({width:await page.evaluate(()=>document.documentElement.clientWidth)});
  const m=await page.evaluate(()=>{
    const root=document.documentElement;
    return {client:root.clientWidth,scroll:Math.max(root.scrollWidth,document.body.scrollWidth)};
  });
  expect(m.scroll,route+" overflows viewport "+JSON.stringify(m)).toBeLessThanOrEqual(m.client+2);
}

test("home navigation works with touch and portrait, landscape, split view",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto("/",{waitUntil:"domcontentloaded"});
  expect(response?.status()).toBe(200);
  await expect(page.locator(".home-hero")).toBeVisible();
  await expect(page.getByRole("link",{name:"开始计算训练"}).first()).toBeVisible();
  await expectViewportFits(page,"/");
  const toggle=page.getByRole("button",{name:"打开导航菜单"});
  if(await toggle.isVisible()){
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded","true");
    await expect(page.getByRole("navigation",{name:"移动端导航"}).getByRole("link",{name:"全球赛事"})).toBeVisible();
    await page.getByRole("navigation",{name:"移动端导航"}).getByRole("link",{name:"全球赛事"}).tap();
  }else{
    await page.locator(".home-hero").getByRole("link",{name:"探索全球赛事"}).tap();
  }
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading",{name:"全球数学赛事管家"})).toBeVisible();
  await expectViewportFits(page,"/events");
  expect(errors,"WebKit JavaScript errors").toEqual([]);
});

test("event filters remain usable without horizontal scrolling",async({page})=>{
  await page.goto("/events");
  const cards=page.locator('section[aria-label="赛事列表"] article');
  await expect(cards.first()).toBeVisible();
  const all=await cards.count();
  expect(all).toBeGreaterThan(5);
  await page.getByRole("combobox",{name:"地区"}).selectOption("CN");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThan(all);
  await page.getByRole("searchbox",{name:"搜索赛事"}).fill("华罗庚");
  await expect(cards).toHaveCount(1);
  await expectViewportFits(page,"/events filtered");
  await page.getByRole("searchbox",{name:"搜索赛事"}).fill("xxxxxxxx-unknown-competition");
  await page.getByRole("button",{name:"查看全部赛事"}).tap();
  await expect(cards).toHaveCount(all);
  await expectViewportFits(page,"/events reset");
});

test("math training, mock exam and login have usable, non-clipped iPad layout",async({page})=>{
  for(const route of ["/arithmetic","/competitions","/login","/membership"]){
    const response=await page.goto(route,{waitUntil:"domcontentloaded"});
    expect(response?.status(),route+" status").toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
    await expectViewportFits(page,route);
  }
  await page.goto("/login");
  const field=page.locator('input[type="password"]').first();
  await expect(field).toBeVisible();
  await field.tap();
  await expect(field).toBeFocused();
  await expectViewportFits(page,"/login focus");
});
