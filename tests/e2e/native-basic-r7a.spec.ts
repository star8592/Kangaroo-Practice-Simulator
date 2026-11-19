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
 scoring_status:"connected",scoring_message:"供测试参考",
};
function sineWav(duration=.75):Buffer{
 const hz=16000,samples=Math.round(duration*hz),b=Buffer.alloc(44+samples*2);
 b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);
 b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(hz,24);b.writeUInt32LE(hz*2,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write("data",36);b.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)b.writeInt16LE(Math.round(Math.sin(i/hz*2*Math.PI*330)*.3*32767),44+i*2);
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
async function open(page:import("@playwright/test").Page,reply?:{score?:number}|null){
 const scores:string[]=[];
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/app/audio/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:sineWav(),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  scores.push(route.request().url());
  if(!reply)return route.fulfill({status:503,body:"offline"});
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({...reply,differences:{words_with_errors:["octopus"]}})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句练习")).toBeVisible();
 return scores;
}
test("R7A: 0.3x selects pre-rendered pitch-preserved track; each word can be tapped",async({page})=>{
 test.setTimeout(45000);
 await open(page);
 const speed=page.locator("#native-pronun-speed");
 const audio=page.getByLabel("整句示范音频");
 await expect(speed).toHaveValue("0.7");
 await expect(page.getByText(/每个英文单词都能点/)).toBeVisible();
 await speed.selectOption("0.3");
 await expect(audio).toHaveAttribute("src",/slow-03\/octopus-flexibility\.mp3$/);
 expect(await audio.evaluate(el=>({
  rate:(el as HTMLAudioElement).playbackRate,
  pitch:(el as HTMLAudioElement).preservesPitch,
 }))).toEqual({rate:1,pitch:true});
 await page.evaluate(()=>{
  const audit:{text:string;rate:number}[]=[];
  (window as unknown as {__r7aWords:typeof audit}).__r7aWords=audit;
  Object.defineProperty(window,"speechSynthesis",{
   configurable:true,
   value:{cancel(){},speak(s:SpeechSynthesisUtterance){audit.push({text:s.text,rate:s.rate});}},
  });
 });
 await page.getByRole("button",{name:"octopus",exact:true}).click();
 await expect(page.getByText(/正在读 octopus/)).toBeVisible();
 const said=await page.evaluate(()=>(window as unknown as {__r7aWords:{text:string;rate:number}[]}).__r7aWords);
 expect(said).toEqual([{text:"octopus",rate:.3}]);
 await page.getByRole("button",{name:"curious.",exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {__r7aWords:{text:string;rate:number}[]}).__r7aWords))
  .toEqual([{text:"octopus",rate:.3},{text:"curious",rate:.3}]);
 await speed.selectOption("0.5");
 await expect(audio).toHaveAttribute("src",/follow-along\/octopus-flexibility\.mp3$/);
 expect(await audio.evaluate(el=>(el as HTMLAudioElement).playbackRate)).toBe(.5);
 await speed.selectOption("1");
 expect(await audio.evaluate(el=>(el as HTMLAudioElement).playbackRate)).toBe(1);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("R7A: missing 0.3x track safely falls back to browser pitch-preserved playback",async({page})=>{
 test.setTimeout(40000);
 await page.route("**/english/pronunciation/next-lab/audio/slow-03/**",
  route=>route.fulfill({status:404,body:"missing"}));
 await open(page);
 const audio=page.getByLabel("整句示范音频");
 await page.locator("#native-pronun-speed").selectOption("0.3");
 await page.getByRole("button",{name:/听整句/}).click();
 await expect(page.getByText(/已改用设备的极慢速播放/)).toBeVisible();
 await expect(audio).toHaveAttribute("src",/follow-along\/octopus-flexibility\.mp3$/);
 expect(await audio.evaluate(el=>({
  rate:(el as HTMLAudioElement).playbackRate,pitch:(el as HTMLAudioElement).preservesPitch,
 }))).toEqual({rate:.3,pitch:true});
});

test("R7A: score is real 0–100 and guidance names only an actual highlighted word",async({page})=>{
 test.setTimeout(55000);
 const scoreCalls=await open(page,{score:68});
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.getByRole("button",{name:/停止并评分/}).waitFor();
 await page.waitForTimeout(1200);
 await page.getByRole("button",{name:/停止并评分/}).click();
 const result=page.getByRole("region",{name:"本次得分"});
 await expect(result).toContainText("68");
 await expect(result).toContainText("100 分");
 await expect(result).toContainText("octopus");
 await expect(result).toContainText("下一步");
 expect(scoreCalls).toHaveLength(1);
 await expect(page.getByRole("button",{name:/只练一个词/})).toBeVisible();
});

test("R7A: scoring outage never invents a score or exposes backend errors to children",async({page})=>{
 test.setTimeout(55000);
 await open(page,null);
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.getByRole("button",{name:/停止并评分/}).waitFor();
 await page.waitForTimeout(1200);
 await page.getByRole("button",{name:/停止并评分/}).click();
 await expect(page.getByText(/这次没有打出分数/)).toBeVisible();
 await expect(page.getByRole("region",{name:"本次得分"})).toHaveCount(0);
 await expect(page.getByRole("button",{name:/一键听音/})).toBeEnabled();
});
