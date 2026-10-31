import {expect,test} from "@playwright/test";
import {readFile} from "node:fs/promises";

test("generic exam planner saves an interview and exports a real calendar alarm",async({page})=>{
  await page.goto("/exam-planner");
  await expect(page.getByRole("heading",{name:"我的考试管理"})).toBeVisible();
  await expect(page.getByRole("link",{name:/打开数学赛事管家/})).toHaveAttribute("href","/events");
  await page.getByLabel("考试或事项名称").fill("国考面试");
  await page.getByLabel("所属考试领域").selectOption("professional");
  await page.getByLabel("关键阶段").selectOption("interview");
  await page.getByLabel("日期",{exact:true}).fill("2026-12-10");
  await page.getByLabel("具体时间（选填）").fill("09:30");
  await page.getByLabel("提前提醒").selectOption("3");
  await page.getByRole("button",{name:"保存到本机"}).click();
  await expect(page.getByRole("heading",{name:"国考面试"})).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading",{name:"国考面试"})).toBeVisible();
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:/导出日历提醒/}).click();
  const download=await downloaded;
  expect(download.suggestedFilename()).toBe("socthink-exam-plan.ics");
  const file=await download.path();
  expect(file).toBeTruthy();
  const text=await readFile(file!,"utf8");
  expect(text).toContain("BEGIN:VEVENT");
  expect(text).toContain("DTSTART:20261210T093000");
  expect(text).toContain("TRIGGER:-P3D");
  expect(text).toContain("END:VCALENDAR");

  await page.getByRole("button",{name:"删除"}).click();
  await expect(page.getByRole("heading",{name:"国考面试"})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading",{name:"国考面试"})).toHaveCount(0);
});

test("date-only event remains an all-day milestone; no fake push promise",async({page})=>{
  await page.goto("/exam-planner");
  await page.getByLabel("考试或事项名称").fill("雅思报名截止");
  await page.getByLabel("所属考试领域").selectOption("language");
  await page.getByLabel("关键阶段").selectOption("registration");
  await page.getByLabel("日期",{exact:true}).fill("2026-12-19");
  await page.getByRole("button",{name:"保存到本机"}).click();
  await expect(page.getByRole("heading",{name:"雅思报名截止"})).toBeVisible();
  await expect(page.getByText(/本站不自动验证报名或考试时间/)).toBeVisible();
  const downloaded=page.waitForEvent("download");
  await page.getByRole("button",{name:/导出日历提醒/}).click();
  const download=await downloaded;
  const text=await readFile((await download.path())!,"utf8");
  expect(text).toContain("DTSTART;VALUE=DATE:20261219");
  expect(text).toContain("TRIGGER:-P1D");
});

test("exam manager remains legible and scrollable on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("button",{name:"打开导航菜单"}).click();
  await page.getByRole("navigation",{name:"移动端导航"})
    .getByRole("link",{name:"考试管理"}).click();
  await expect(page).toHaveURL(/\/exam-planner$/);
  await expect(page.getByLabel("所属考试领域")).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
