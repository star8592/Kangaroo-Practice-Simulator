import {expect,test} from "@playwright/test";

const sentence={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus is curious.",translation:"章鱼很好奇。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"通用美式英语 · AI 合成示范",disclosure:"本地参考音",
 content_origin:"original",
};
const catalog={
 items:[sentence,{...sentence,id:"honeybee-dance",sentence:"Bees share information.",
  translation:"蜜蜂分享信息。",audio_url:"/app/audio/follow-along/honeybee-dance.mp3"}],
 scoring_status:"connected",scoring_message:"仅实验评分",
};
function sineWav(duration=.65):Buffer{
 const hz=16000,samples=Math.round(hz*duration);
 const buffer=Buffer.alloc(44+samples*2);
 buffer.write("RIFF",0);buffer.writeUInt32LE(buffer.length-8,4);
 buffer.write("WAVE",8);buffer.write("fmt ",12);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);
 buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(hz,24);
 buffer.writeUInt32LE(hz*2,28);buffer.writeUInt16LE(2,32);
 buffer.writeUInt16LE(16,34);buffer.write("data",36);
 buffer.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++){
  const amp=i<600?0:Math.sin(i/hz*2*Math.PI*310)*.30;
  buffer.writeInt16LE(Math.round(amp*32767),44+i*2);
 }
 return buffer;
}
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream","--autoplay-policy=no-user-gesture-required"],
 },
});

test("V3 parity: actual recorded waveform, region playback and focused Rust word score",async({page})=>{
 test.setTimeout(45000);
 const wav=sineWav(),scoreCalls:{path:string;size:number}[]=[];
 await page.route("**/english/pronunciation/app/audio/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:wav,
 }));
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",async route=>{
  const request=route.request();
  if(request.method()!=="POST")throw Error("Scoring requires POST");
  scoreCalls.push({path:request.url(),size:request.postDataBuffer()?.length??0});
  const isWord=request.url().includes("/score-word/");
  await route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({score:isWord?72:86,
    transcribe:isWord?"octopus":"An octopus is curious",
    differences:{words_with_errors:["octopus"]}})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句练习")).toBeVisible();
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.getByRole("button",{name:/停止并评分/}).waitFor();
 await page.waitForTimeout(1100);
 await page.getByRole("button",{name:/停止并评分/}).click();
 await expect(page.getByRole("region",{name:"本次得分"})).toContainText("86");
 expect(scoreCalls).toHaveLength(1);
 expect(scoreCalls[0].size).toBeGreaterThan(1000);
 await expect(page.getByRole("button",{name:/听听我的录音对照/})).toBeVisible();
 await page.getByRole("button",{name:/听听我的录音对照/}).click();
 const wave=page.getByTestId("native-synced-audio");
 await expect(wave.getByText(/已按真实起声时间对齐/)).toBeVisible();
 await expect(wave.getByRole("img",{name:/双轨波形/})).toBeVisible();
 await wave.getByRole("slider",{name:"微调橙色声波"}).fill("0.3");
 await expect(wave.getByRole("slider",{name:"微调橙色声波"})).toHaveValue("0.3");
 await wave.getByRole("button",{name:"归零"}).click();
 await expect(wave.getByRole("slider",{name:"微调橙色声波"})).toHaveValue("0");
 await page.getByRole("button",{name:/只练一个词/}).click();
 const focus=page.getByTestId("native-focused-word");
 await expect(focus.getByRole("button",{name:"octopus",exact:true})).toHaveAttribute("aria-pressed","true");
 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await focus.getByRole("button",{name:"停止单词录音"}).waitFor();
 await page.waitForTimeout(1400);
 await focus.getByRole("button",{name:"停止单词录音"}).click();
 await expect(focus.getByText(/单词得分/)).toContainText("72");
 await expect(focus.getByLabel("我的单词录音回听")).toBeVisible();
 expect(scoreCalls).toHaveLength(2);
 expect(scoreCalls[1].path).toContain("/score-word/octopus");
 expect(scoreCalls[1].size).toBeGreaterThan(1024);
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(page.getByText("蜜蜂分享信息。")).toBeVisible();
 await expect(page.getByTestId("native-synced-audio")).toHaveCount(0);
 await expect(page.getByTestId("native-focused-word")).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("Rust word-scoring 503 is disclosed without a fabricated result",async({page})=>{
 test.setTimeout(45000);
 const wav=sineWav();
 await page.route("**/english/pronunciation/app/audio/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:wav,
 }));
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  if(route.request().url().includes("/score-word/"))return route.fulfill({status:503,body:"offline"});
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({score:85,differences:{words_with_errors:["octopus"]}})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await page.getByText("2 句练习").waitFor();
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.getByRole("button",{name:/停止并评分/}).waitFor();
 await page.waitForTimeout(900);
 await page.getByRole("button",{name:/停止并评分/}).click();
 await expect(page.getByRole("region",{name:"本次得分"})).toContainText("85");
 await page.getByRole("button",{name:/只练一个词/}).click();
 const focus=page.getByTestId("native-focused-word");
 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await focus.getByRole("button",{name:"停止单词录音"}).waitFor();
 await page.waitForTimeout(1400);
 await focus.getByRole("button",{name:"停止单词录音"}).click();
 await expect(focus.getByText(/这次没能打分/)).toBeVisible();
 await expect(focus.getByText(/单词得分/)).toHaveCount(0);
});
