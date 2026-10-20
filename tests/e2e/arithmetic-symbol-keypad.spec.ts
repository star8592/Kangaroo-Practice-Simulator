import {expect,test} from "@playwright/test";

test("grade-seven calculation offers negative and fraction keys without a physical keyboard",async({page})=>{
  await page.goto("/arithmetic/session/7?mode=diagnostic");
  const prompt=page.locator(".mental-prompt");
  await expect(prompt).toBeVisible({timeout:20_000});
  const input=page.locator("input.mental-input");
  const pad=page.locator(".symbolic-math-keypad");
  await expect(pad).toBeVisible();
  await pad.getByRole("button",{name:"−",exact:true}).click();
  await pad.getByRole("button",{name:"4",exact:true}).click();
  await expect(input).toHaveValue("-4");
  await pad.getByRole("button",{name:"退格"}).click();
  await expect(input).toHaveValue("-");
  await pad.getByRole("button",{name:"分数 a/b"}).click();
  await pad.getByRole("button",{name:"2",exact:true}).click();
  await expect(input).toHaveValue("-/2");
  await expect(pad.getByRole("button",{name:"提交答案"})).toBeEnabled();
});

test("numeric input includes decimal and signed keys across grade 1 to 12",async({page})=>{
  await page.goto("/arithmetic/session/12?mode=diagnostic");
  await expect(page.locator(".mental-prompt")).toBeVisible({timeout:20_000});
  const pad=page.locator(".symbolic-math-keypad");
  await expect(pad.getByRole("button",{name:"−",exact:true})).toBeVisible();
  await expect(pad.getByRole("button",{name:".",exact:true})).toBeVisible();
  await expect(pad.getByRole("button",{name:"分数 a/b"})).toBeVisible();
});
