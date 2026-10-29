import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { issueAdminInvitation } from "../../src/lib/admin-invitation";

test("one-use verified invitation lets owner set password on desktop and mobile", async ({ page, browser }) => {
  const base = new URL(process.env.E2E_BASE_URL || "https://unconfigured.invalid");
  test.skip(process.env.SOCTHINK_E2E_SYNTHETIC !== "1" ||
    !["localhost", "127.0.0.1"].includes(base.hostname),
    "Requires explicit synthetic tests on a local isolated server");
  const suffix = crypto.randomBytes(8).toString("hex");
  const invite = issueAdminInvitation("owner-" + suffix + "@example.test");
  const password = ["Synthetic", "browser", "owner", suffix, "password"].join("-");
  const guest = await browser.newContext({ baseURL: base.origin });
  try {
    const guestPage = await guest.newPage();
    await guestPage.goto("/admin/feedback");
    await expect(guestPage).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/activate#invite=" + invite.token);
    await expect(page.getByRole("heading", { name:"设置正式管理员密码" })).toBeVisible();
    await expect(page).not.toHaveURL(/#invite=/);
    await page.getByLabel("设置管理员密码（12–128个字符）").fill(password);
    await page.getByLabel("再次确认管理员密码").fill(password);
    await page.getByRole("button", { name:"验证邮箱邀请并启用管理员账号" }).click();
    await expect(page).toHaveURL(/\/admin\/feedback/);
    await expect(page.getByRole("heading", { name:"客户反馈处理台" })).toBeVisible();
    const replay = await page.request.post("/api/admin/activate", {
      headers: { origin: base.origin },
      data: { token: invite.token, pin: password, confirm: password },
    });
    expect(replay.status()).toBe(400);
  } finally {
    await guest.close();
  }
});
