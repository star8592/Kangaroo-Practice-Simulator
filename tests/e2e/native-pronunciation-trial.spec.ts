import {expect,test} from "@playwright/test";

const sample={
 items:[
  {id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
   sentence:"An octopus is curious.",translation:"章鱼很好奇。",
   audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
   voice_profile:"通用美式英语 · AI 合成示范",disclosure:"原始 Rust 语料",content_origin:"original"},
  {id:"honeybee-dance",title:"The Dance of Honeybees",level:"B1",topic:"Nature",
   sentence:"Bees share information.",translation:"蜜蜂分享信息。",
   audio_available:true,audio_url:"/app/audio/follow-along/honeybee-dance.mp3",
   voice_profile:"通用美式英语 · AI 合成示范",disclosure:"原始 Rust 语料",content_origin:"original"},
 ],
 scoring_status:"connected",scoring_message:"Rust connected",
};
test("Next-native pronunciation trial reads Rust catalog and keeps a compact mobile workflow",async({page,isMobile})=>{
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(sample),
 }));
 const response=await page.goto("/english/pronunciation/next-lab");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{name:"听一句，跟读一句"})).toBeVisible();
 await expect(page.getByText("章鱼很好奇。")).toBeVisible();
 await expect(page.getByText("2 句练习")).toBeVisible();
 await expect(page.getByRole("button",{name:/一键听音/})).toBeEnabled();
 await expect(page.locator('audio')).toHaveAttribute("src",
  "/english/pronunciation/app/audio/follow-along/octopus-flexibility.mp3");
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(page.getByText("蜜蜂分享信息。")).toBeVisible();
 await page.getByLabel("听整句的速度").selectOption("0.5");
 await expect(page.getByLabel("听整句的速度")).toHaveValue("0.5");
 await page.getByText("其他练习与教师入口").click();
 await expect(page.getByRole("link",{name:"原有发音工作台"})).toHaveAttribute(
  "href","/english/pronunciation/app/practice-library");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))
  .toBeLessThanOrEqual(isMobile?2:2);
});
test("Rust outage shows an error instead of fake sentences, scores or playback",async({page})=>{
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:503,contentType:"application/json",body:JSON.stringify({error:"unavailable"}),
 }));
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.locator("main p[role=alert]")).toContainText("练习暂时打不开");
 await expect(page.getByRole("button",{name:/一键听音/})).toHaveCount(0);
 await expect(page.locator("main")).not.toContainText("Rust 评分已返回");
});
