import {expect,test} from "@playwright/test";

test("career home prioritizes role choice, then complete training and mock service",async({page})=>{
  const response=await page.goto("/career");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:/选择目标岗位，补足关键能力/})).toBeVisible();
  const isNarrow=page.viewportSize()!.width<=920;
  const roleAction=isNarrow
    ?page.getByRole("link",{name:/^找目标岗位/})
    :page.getByRole("link",{name:/查看岗位方向/});
  const practiceAction=isNarrow
    ?page.getByRole("link",{name:/做模拟笔试与面试/})
    :page.getByRole("link",{name:/查看正式模拟与面试/});
  await expect(roleAction).toBeVisible();
  await expect(practiceAction).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await roleAction.click();
  await expect(page).toHaveURL(/#career-directory$/);
  await practiceAction.click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading",{level:1,name:/用模拟检验求职准备程度/})).toBeVisible();
  await page.goto("/career");

  const directory=page.locator("#career-directory");
  await expect(directory).toBeVisible();
  await expect(directory).toContainText("270");
  await expect(directory.locator("button[aria-pressed]")).toHaveCount(14);
  await expect(directory.locator("article")).toHaveCount(13);
  const industry=directory.getByRole("button",{name:/制造业与工业工程/});
  await industry.click();
  await expect(industry).toHaveAttribute("aria-pressed","true");
  await expect(directory.getByRole("heading",{name:"工业质量与可靠性"})).toBeVisible();

  const filter=directory.getByRole("searchbox",{name:"搜索具体岗位"});
  await filter.fill("质量工程师");
  const direct=directory.getByRole("link",{name:/^质量工程师/});
  await expect(direct).toBeVisible();
  await direct.click();
  await expect(page).toHaveURL(/\/career\/roles\/industry-02-01$/);
  await expect(page.getByRole("heading",{level:1,name:"质量工程师"})).toBeVisible();
  await expect(page.getByRole("link",{name:"免费阅读并下载"})).toBeVisible();
  await expect(page.getByRole("link",{name:"进入45分钟标准笔试"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);

  await page.getByRole("link",{name:"进入45分钟标准笔试"}).click();
  await expect(page).toHaveURL(/\/career\/exams\/quality-paper-2026q4-v1$/);
  await expect(page.getByRole("button",{name:"确认入场 · 开始模拟笔试"})).toBeVisible();
});
