import { test, expect } from "@playwright/test";

test("world companion has one equal-ranking directory and real navigation", async ({ page }) => {
  await page.goto("/competitions");
  await expect(page.getByRole("link",{name:"探索全球赛事 ↓"})).toBeVisible();
  await page.getByRole("link",{name:"探索全球赛事 ↓"}).click();
  await expect(page).toHaveURL(/#world-competition-hub$/);
  const hub = page.getByRole("region",{name:"全球数学赛事管家"});
  await expect(hub).toBeVisible();
  const cards = hub.locator('[aria-label="世界赛事目录"] article');
  await expect(cards).toHaveCount(10);
  await expect(cards.filter({hasText:"华罗庚金杯"})).toHaveCount(1);
  await expect(cards.filter({hasText:"美国 AMC / AIME"})).toHaveCount(1);
  await expect(cards.filter({hasText:"英国 UKMT"})).toHaveCount(1);

  await hub.getByRole("button",{name:"中国",exact:true}).click();
  await expect(cards).toHaveCount(5);
  await hub.getByRole("button",{name:"美国",exact:true}).click();
  await expect(cards).toHaveCount(1);
  await hub.getByRole("button",{name:"全部地区"}).click();
  await expect(cards).toHaveCount(10);
  await hub.getByRole("button",{name:"高中",exact:true}).click();
  await expect(cards.filter({hasText:"全国中学生数学奥林匹克"})).toHaveCount(1);
  await expect(cards.filter({hasText:"华罗庚金杯"})).toHaveCount(0);
  await hub.getByRole("button",{name:"全部学段",exact:true}).click();
  await expect(cards).toHaveCount(10);

  await cards.filter({hasText:"华罗庚金杯"}).getByRole("button",{name:"查看赛事管家"}).click();
  await expect(hub.getByText("华罗庚金杯少年数学邀请赛（华杯赛） · 备赛管家")).toBeVisible();
  await expect(hub.getByRole("link",{name:"登录后关注赛事"})).toBeVisible();
  await expect(hub.getByText("时间待当届公告").first()).toBeVisible();
  await expect(hub.getByText("本届报名未确认")).toBeVisible();

  await cards.filter({hasText:"英国 UKMT"}).getByRole("button",{name:"查看赛事管家"}).click();
  await expect(hub.getByText("英国 UKMT · 参赛准备")).toBeVisible();
  await expect(hub.getByText("核实当地赛区与参赛资格").first()).toBeVisible();
  await expect(hub.getByRole("link",{name:/登录并保存进度/})).toBeVisible();
});

test("worldwide public directory is read-only to anonymous visitors", async ({ request }) => {
  const followGet=await request.get("/api/competition-follow");
  expect(followGet.status()).toBe(401);
  const followPatch=await request.patch("/api/competition-follow",{data:{eventId:"ukmt",following:true}});
  expect(followPatch.status()).toBe(401);
  const r = await request.get("/api/miniapp/world-competitions");
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.entries).toHaveLength(10);
  expect(body.entries.filter((e: {event:{region:string}}) => e.event.region === "CN")).toHaveLength(5);
  for (const e of body.entries) {
    expect(e.progress).toBeNull();
    expect(e.following).toBeNull();
    expect(e.companion).toBeTruthy();
    if (e.companion.registrationVerified === false) {
      expect(e.companion.tasks.every((t: {date?:string})=>!t.date)).toBeTruthy();
    }
  }
  for (const id of ["china-huabei-readiness","world-ukmt-readiness"]) {
    const get = await request.get("/api/competition-companion/progress?companionId="+id);
    expect(get.status()).toBe(401);
    const patch = await request.patch("/api/competition-companion/progress",{
      data:{companionId:id,taskId:"verify",completed:true},
    });
    expect(patch.status()).toBe(401);
  }
});


test("public home lists China and world events at one level with direct links", async ({page}) => {
  await page.goto("/");
  const cards=page.locator(".home-competition-card");
  await expect(cards).toHaveCount(10);
  await expect(cards.filter({hasText:"华罗庚金杯"})).toHaveCount(1);
  await expect(cards.filter({hasText:"英国 UKMT"})).toHaveCount(1);
  await cards.filter({hasText:"华罗庚金杯"}).click();
  await expect(page).toHaveURL(/\/competitions\?event=huabei$/);
  const hub=page.getByRole("region",{name:"全球数学赛事管家"});
  await expect(hub.getByText("华罗庚金杯少年数学邀请赛（华杯赛） · 备赛管家")).toBeVisible();
  await expect(hub.getByRole("link",{name:"登录后关注赛事"})).toBeVisible();
});
