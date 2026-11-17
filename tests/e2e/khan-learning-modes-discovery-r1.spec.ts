import {expect,test} from "@playwright/test";

test("public homepage lets independent learners study or discover teachers",async({page})=>{
 await page.goto("/");
 const selfStudy=page.getByRole("link",{name:"立即自主学习"});
 const findTeacher=page.getByRole("link",{name:"找老师 · 选班级"});
 await expect(selfStudy).toHaveAttribute("href","/english");
 await expect(findTeacher).toHaveAttribute("href","/teachers");
 await findTeacher.click();
 await expect(page).toHaveURL(/\/teachers$/);
 await expect(page.getByRole("heading",{name:"想跟老师学？自己选。"})).toBeVisible();
 await expect(page.getByRole("link",{name:"继续自主学习"})).toHaveAttribute("href","/my/learning");
 await expect(page.getByText("老师主动公开 · 学生自主选择 · 申请后由老师审核")).toBeVisible();
});

test("390px mobile guest can switch to teacher discovery without horizontal overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/");
 await expect(page.getByRole("link",{name:"找老师 · 选班级"})).toBeVisible();
 await page.getByRole("link",{name:"找老师 · 选班级"}).click();
 await expect(page.getByRole("heading",{name:"想跟老师学？自己选。"})).toBeVisible();
 const width=await page.evaluate(()=>({
  viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
 }));
 expect(width.scroll).toBeLessThanOrEqual(width.viewport+2);
});

test("public independent learning remains accessible without teacher enrollment",async({page})=>{
 const response=await page.goto("/english");
 expect(response?.status()).toBe(200);
 await expect(page).toHaveURL(/\/english$/);
});
