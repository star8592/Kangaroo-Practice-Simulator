import {expect,test} from "@playwright/test";

test("homepage exposes two real frontier engineering courses without scrolling",async({page})=>{
  const response=await page.goto("/");
  expect(response?.status()).toBe(200);
  const hero=page.getByRole("main").getByRole("link",{name:/AI Agent 实战|AI Agent Lab/}).first();
  const gpu=page.getByRole("main").getByRole("link",{name:/WebGPU 3D 实战|WebGPU 3D Lab/}).first();
  await expect(hero).toBeVisible();
  await expect(gpu).toBeVisible();
  for(const link of [hero,gpu]){
    const box=await link.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan((page.viewportSize()?.height??900)-20);
    expect(box!.width).toBeGreaterThan(80);
  }
  const preview=page.getByRole("heading",{level:2,name:/前沿技术|Frontier Skills/});
  await expect(preview).toBeVisible();
  await expect(page.locator('a[href="/skill-labs/agent-foundations"]')).toHaveCount(2);
  await expect(page.locator('a[href="/skill-labs/webgpu-basics"]')).toHaveCount(2);
  await expect(page.locator('a[href="/career"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true);
  await hero.click();
  await expect(page).toHaveURL(/\/skill-labs\/agent-foundations$/);
  await expect(page.getByRole("heading",{level:1,name:/AI Agent 工程实战/})).toBeVisible();
});
test("home WebGPU hero navigation opens a real 3D exercise",async({page})=>{
  await page.goto("/");
  await page.getByRole("main").getByRole("link",{name:/WebGPU 3D 实战|WebGPU 3D Lab/}).first().click();
  await expect(page).toHaveURL(/\/skill-labs\/webgpu-basics$/);
  await expect(page.getByRole("heading",{level:1,name:/Three.js.*WebGPU/})).toBeVisible();
  await expect(page.getByRole("link",{name:/下载完整源工程 ZIP/})).toBeVisible();
});
