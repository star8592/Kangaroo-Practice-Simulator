import {expect,test} from "@playwright/test";

/**
 * A portal page may be vertically long or internally complex, but every
 * top-level business screen must share the homepage's horizontal content line.
 * This checks layout, not just presence of a nav link or lack of overflow.
 */
const publicRoutes=[
  "/",
  "/assessments",
  "/resources",
  "/exam-planner",
  "/membership",
  "/shop",
  "/competitions",
  "/events",
] as const;

for(const width of [390,1440] as const){
  test(`public portal aligns all business shells at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    let homeLine:{left:number;right:number}|null=null;
    for(const route of publicRoutes){
      const response=await page.goto(route,{waitUntil:"domcontentloaded"});
      expect(response?.status(),`HTTP 200: ${route}`).toBe(200);
      const shell=page.locator('main [data-site-shell="content"]').first();
      await expect(shell,`Missing shared layout shell on ${route}`).toBeVisible();
      const metric=await shell.evaluate(element=>{
        const box=element.getBoundingClientRect();
        const style=getComputedStyle(element);
        return {
          left:box.left+parseFloat(style.paddingLeft),
          right:box.right-parseFloat(style.paddingRight),
          overflow:document.documentElement.scrollWidth-window.innerWidth,
        };
      });
      expect(metric.overflow,`Horizontal overflow at ${route}, ${width}px`).toBeLessThanOrEqual(2);
      expect(metric.right-metric.left,`Content must remain legible: ${route}`).toBeGreaterThan(250);
      if(!homeLine){homeLine={left:metric.left,right:metric.right};continue;}
      expect(Math.abs(metric.left-homeLine.left),`Left content edge diverged: ${route}`).toBeLessThanOrEqual(2);
      expect(Math.abs(metric.right-homeLine.right),`Right content edge diverged: ${route}`).toBeLessThanOrEqual(2);
    }
  });
}
