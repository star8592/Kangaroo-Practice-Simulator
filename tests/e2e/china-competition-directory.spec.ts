import { test, expect } from "@playwright/test";

test("China competition catalogue opens real advisory timelines", async ({ page }) => {
  await page.goto("/competitions");
  await expect(page.getByRole("link", { name: "中国数学赛事管家 ↓" })).toBeVisible();
  await page.getByRole("link", { name: "中国数学赛事管家 ↓" }).click();
  await expect(page).toHaveURL(/#china-math-companion$/);
  const directory = page.getByRole("region", { name: "中国数学竞赛管家" });
  await expect(directory).toBeVisible();
  await expect(directory.getByText("华罗庚金杯少年数学邀请赛（华杯赛）").first()).toBeVisible();
  await expect(directory.getByText("全国中学生数学奥林匹克竞赛").first()).toBeVisible();
  await expect(directory.getByText("历史赛事 · 内地当届报名未核验")).toBeVisible();

  await directory.getByRole("button", { name: "查看流程与准备" }).first().click();
  await expect(directory.getByText("走进美妙的数学花园（走美杯） · 备赛管家")).toBeVisible();
  await expect(directory.getByText("线上调试或线下赴考检查")).toBeVisible();
  await expect(directory.getByText("时间待当届公告").first()).toBeVisible();
  await expect(directory.getByText("本届报名未确认")).toBeVisible();

  await directory.getByRole("button", { name: "查看流程与准备" }).nth(1).click();
  await expect(directory.getByText("希望杯数学邀请赛 · 备赛管家")).toBeVisible();
  await expect(directory.getByText("国际活动有信息 · 内地资格待核验").first()).toBeVisible();

  await expect(directory.getByRole("link", { name: /登录并保存进度/ })).toBeVisible();
});


test("guest reads only public China catalog and cannot write progress", async ({ request }) => {
  const response = await request.get("/api/miniapp/china-competitions");
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.entries).toHaveLength(5);
  for (const entry of result.entries) {
    expect(entry.progress).toBeNull();
    expect(entry.companion.registrationVerified).toBe(false);
    for (const task of entry.companion.tasks) {
      expect(task.date).toBeUndefined();
      expect(task.kind).toBe("site");
    }
  }
  const item = result.entries[0];
  const getProgress = await request.get("/api/competition-companion/progress?companionId=" + item.companion.id);
  expect(getProgress.status()).toBe(401);
  const patchProgress = await request.patch("/api/competition-companion/progress", {
    data: { companionId: item.companion.id, taskId: item.companion.tasks[0].id, completed: true },
  });
  expect(patchProgress.status()).toBe(401);
});
