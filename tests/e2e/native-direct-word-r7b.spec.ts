import {expect,test} from "@playwright/test";

const first={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus is curious.",translation:"章鱼很好奇。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"示范音",disclosure:"测试",content_origin:"original",
};
const catalog={
 items:[first,{...first,id:"bees-short-dance",sentence:"Bees dance.",
  translation:"蜜蜂跳舞。",audio_url:"/app/audio/follow-along/bees-short-dance.mp3"}],
 scoring_status:"connected",scoring_message:"受控测试",
};
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",
   "--autoplay-policy=no-user-gesture-required"],
 },
});
async function ready(page:import("@playwright/test").Page){
 const calls:string[]=[];
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  calls.push(route.request().url());
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({score:81})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句练习")).toBeVisible();
 return calls;
}
test("R7B: choose direct word mode without full sentence score, record and return",async({page})=>{
 test.setTimeout(60000);
 const calls=await ready(page);
 await expect(page.getByRole("button",{name:"基础跟读",exact:true})).toHaveAttribute("aria-pressed","true");
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 const wordMode=page.getByTestId("native-direct-word-mode");
 await expect(wordMode).toBeVisible();
 await expect(page.getByRole("button",{name:/一键听音/})).toHaveCount(0);
 await wordMode.locator("#native-word-mode-speed").selectOption("0.3");
 await expect(wordMode.getByText(/不需要先读完整句/)).toBeVisible();
 const focus=wordMode.getByTestId("native-focused-word");
 await focus.getByRole("button",{name:"octopus",exact:true}).click();
 await expect(focus.getByRole("button",{name:"octopus",exact:true})).toHaveAttribute("aria-pressed","true");
 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await focus.getByRole("button",{name:"停止单词录音"}).waitFor();
 await page.waitForTimeout(1400);
 await focus.getByRole("button",{name:"停止单词录音"}).click();
 await expect(focus.getByText(/单词得分/)).toContainText("81");
 expect(calls).toHaveLength(1);
 expect(calls[0]).toContain("/score-word/octopus");
 await page.getByRole("button",{name:"基础跟读",exact:true}).click();
 await expect(page.getByRole("button",{name:/一键听音/})).toBeVisible();
 await expect(page.getByTestId("native-direct-word-mode")).toHaveCount(0);
});

test("R7B: mode switching and next sentence do not reuse old word recordings",async({page})=>{
 const calls=await ready(page);
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 const focus=page.getByTestId("native-focused-word");
 await expect(focus.getByRole("button",{name:"octopus",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(page.getByText("蜜蜂跳舞。")).toBeVisible();
 await expect(page.getByTestId("native-focused-word").getByRole("button",{name:"Bees",exact:true})).toBeVisible();
 await expect(page.getByTestId("native-focused-word").getByRole("button",{name:"octopus",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"基础跟读",exact:true}).click();
 await expect(page.getByRole("button",{name:/一键听音/})).toBeVisible();
 expect(calls).toHaveLength(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});
