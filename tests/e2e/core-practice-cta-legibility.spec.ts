import {expect,test} from "@playwright/test";

for(const width of [390,1440] as const){
  test("math contest and arithmetic actions are readable at "+width+"px",async({page})=>{
    await page.setViewportSize({width,height:844});
    await page.goto("/competitions");
    const hero=page.locator(".home-shell > .hero-card").first();
    const openMocks=hero.getByRole("link",{name:/选择模拟考试/});
    const events=hero.getByRole("link",{name:/进入赛事管家/});
    await expect(openMocks).toBeVisible();
    await expect(events).toBeVisible();
    for(const element of [openMocks,events]){
      const style=await element.evaluate(e=>({font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height}));
      expect(style.font,"Main contest CTA text").toBeGreaterThanOrEqual(16);
      expect(style.height,"Contest CTA touch target").toBeGreaterThanOrEqual(44);
    }
    await page.goto("/arithmetic");
    const arithmetic=page.locator(".arithmetic-home > .hero-card");
    const start=arithmetic.getByRole("link",{name:/20\s*题.*诊断|20-question diagnostic/});
    await expect(start).toBeVisible();
    const style=await start.evaluate(e=>({font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height}));
    expect(style.font,"Start diagnostic CTA text").toBeGreaterThanOrEqual(16);
    expect(style.height,"Start diagnostic touch target").toBeGreaterThanOrEqual(44);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflow,"No horizontal overflow").toBeLessThanOrEqual(2);
  });
}
