import {expect,test} from "@playwright/test";

const item={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus has no bones, so it can squeeze through surprisingly narrow spaces.",
 translation:"章鱼没有骨头，因此它能够挤过非常狭窄的空间。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"示范音",disclosure:"测试",content_origin:"original",
};
const catalog={
 items:[item,{...item,id:"bees-short-dance",
  sentence:"Inside the dark hive, it performs a short dance that gives other bees clues about where to look.",
  translation:"在昏暗的蜂巢里，它会跳一段短舞，为其他蜜蜂提供寻找花朵的线索。",
  audio_url:"/app/audio/follow-along/bees-short-dance.mp3"}],
 scoring_status:"connected",scoring_message:"受控本地测试",
};
function sineWav(duration=.85):Buffer{
 const hz=16000,n=Math.round(duration*hz),b=Buffer.alloc(44+n*2);
 b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);
 b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(hz,24);b.writeUInt32LE(hz*2,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write("data",36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/hz*2*Math.PI*330)*.3*32767),44+i*2);
 return b;
}
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",
   "--autoplay-policy=no-user-gesture-required"],
 },
});
async function open(page:import("@playwright/test").Page,scoring:{score:number;transcribe?:string}|null){
 const calls:string[]=[];
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/app/audio/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:sineWav(),
 }));
 await page.route("**/english/pronunciation/next-lab/audio/slow-03/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:sineWav(),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  calls.push(route.request().url());
  if(!scoring)return route.fulfill({status:503,body:"offline"});
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({...scoring,differences:{words_with_errors:["bones"]}})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句练习")).toBeVisible();
 return calls;
}

test("R7C: question, slow help, optional answer and real reference-score round trip",async({page})=>{
 test.setTimeout(60000);
 const calls=await open(page,{score:72,transcribe:"A different but valid answer"});
 await expect(page.getByRole("button",{name:"基础跟读",exact:true})).toHaveAttribute("aria-pressed","true");
 await page.getByRole("button",{name:"情景问答",exact:true}).click();
 const dialogue=page.getByTestId("native-guided-dialogue");
 await expect(dialogue.getByText("How can an octopus fit into very small spaces?")).toBeVisible();
 await expect(dialogue.getByText(item.sentence)).toHaveCount(0);
 await page.evaluate(()=>{
  const messages:{text:string;rate:number}[]=[];
  (window as unknown as {__questions:typeof messages}).__questions=messages;
  Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
   cancel(){},speak(u:SpeechSynthesisUtterance){messages.push({text:u.text,rate:u.rate});},
  }});
 });
 await dialogue.locator("#native-dialogue-speed").selectOption("0.3");
 await dialogue.getByRole("button",{name:"听问题"}).click();
 const questions=await page.evaluate(()=>(window as unknown as {__questions:{text:string;rate:number}[]}).__questions);
 expect(questions).toHaveLength(1);
 expect(questions[0].text).toContain("How can an octopus");
 expect(questions[0].rate).toBeCloseTo(.3,5);
 await dialogue.getByRole("button",{name:/看提示/}).click();
 await expect(dialogue.getByText(/章鱼怎么钻进/)).toBeVisible();
 await dialogue.getByRole("button",{name:"看参考答句"}).click();
 await expect(dialogue.getByText(item.sentence)).toBeVisible();
 await dialogue.getByRole("button",{name:"收起参考答句"}).click();
 await expect(dialogue.getByText(item.sentence)).toHaveCount(0);
 await expect(dialogue.getByLabel("情景问答参考答案音频")).toHaveAttribute("src",/slow-03\/octopus-flexibility\.mp3$/);
 await dialogue.getByRole("button",{name:"我来回答并评分"}).click();
 await dialogue.getByRole("button",{name:/停止回答并评分/}).waitFor();
 await expect(dialogue.getByRole("button",{name:"基础跟读"})).toHaveCount(0);
 await page.waitForTimeout(1400);
 await dialogue.getByRole("button",{name:/停止回答并评分/}).click();
 const result=dialogue.getByLabel("问答发音结果");
 await expect(result).toContainText("72");
 await expect(result).toContainText("100 分");
 await expect(result).toContainText("bones");
 await expect(result).toContainText(/不判断其他说法的内容是否正确/);
 expect(calls).toHaveLength(1);
 expect(calls[0]).toContain("/octopus-flexibility/score");
 await dialogue.getByRole("button",{name:"下一问"}).click();
 await expect(dialogue.getByText(/How does a honeybee help/)).toBeVisible();
 await expect(dialogue.getByLabel("问答发音结果")).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("R7C: scoring outage never makes up conversational feedback or a score",async({page})=>{
 test.setTimeout(60000);
 const calls=await open(page,null);
 await page.getByRole("button",{name:"情景问答"}).click();
 const dialogue=page.getByTestId("native-guided-dialogue");
 await dialogue.getByRole("button",{name:"我来回答并评分"}).click();
 await dialogue.getByRole("button",{name:/停止回答并评分/}).waitFor();
 await page.waitForTimeout(1400);
 await dialogue.getByRole("button",{name:/停止回答并评分/}).click();
 await expect(page.getByText(/这次没有打出分数/)).toBeVisible();
 await expect(dialogue.getByLabel("问答发音结果")).toHaveCount(0);
 await expect(dialogue.getByRole("button",{name:"我来回答并评分"})).toBeEnabled();
 expect(calls).toHaveLength(1);
});

test("R7C: mic permission denial does not submit, then learner can switch back",async({page})=>{
 test.setTimeout(30000);
 const calls=await open(page,{score:91});
 await page.getByRole("button",{name:"情景问答"}).click();
 await page.evaluate(()=>{
  Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
   configurable:true,value:()=>Promise.reject(new DOMException("Permission denied","NotAllowedError")),
  });
 });
 await page.getByRole("button",{name:"我来回答并评分"}).click();
 await expect(page.getByText(/没有获得麦克风权限/)).toBeVisible();
 await page.getByRole("button",{name:"基础跟读",exact:true}).click();
 await expect(page.getByRole("button",{name:/一键听音/})).toBeVisible();
 expect(calls).toHaveLength(0);
});
