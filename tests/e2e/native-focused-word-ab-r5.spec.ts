import {expect,test} from "@playwright/test";

const sentence={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus is curious.",translation:"章鱼很好奇。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"测试示范",disclosure:"测试音源",content_origin:"original",
};
const catalog={
 items:[sentence,{...sentence,id:"honeybee-dance",sentence:"Bees share information.",
  translation:"蜜蜂分享信息。",audio_url:"/app/audio/follow-along/honeybee-dance.mp3"}],
 scoring_status:"connected",scoring_message:"本测试使用受控音频和评分响应",
};
function sineWav(duration=.7):Buffer{
 const hz=16000,samples=Math.round(hz*duration);
 const buffer=Buffer.alloc(44+samples*2);
 buffer.write("RIFF",0);buffer.writeUInt32LE(buffer.length-8,4);
 buffer.write("WAVE",8);buffer.write("fmt ",12);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);
 buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(hz,24);
 buffer.writeUInt32LE(hz*2,28);buffer.writeUInt16LE(2,32);
 buffer.writeUInt16LE(16,34);buffer.write("data",36);
 buffer.writeUInt32LE(samples*2,40);
 for(let i=0;i<samples;i++)buffer.writeInt16LE(
  Math.round((i<600?0:Math.sin(i/hz*2*Math.PI*315)*.3)*32767),44+i*2);
 return buffer;
}
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",
   "--autoplay-policy=no-user-gesture-required"],
 },
});

async function openFocusedWord(page:import("@playwright/test").Page,scoreCalls:{path:string;size:number}[]){
 const wav=sineWav();
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
  await route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({score:request.url().includes("/score-word/")?72:86,
    differences:{words_with_errors:["octopus"]}})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句练习")).toBeVisible();
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.getByRole("button",{name:/停止并评分/}).waitFor();
 await page.waitForTimeout(1100);
 await page.getByRole("button",{name:/停止并评分/}).click();
 await expect(page.getByRole("region",{name:"本次得分"})).toContainText("86");
 await page.getByRole("button",{name:/只练一个词/}).click();
 return page.getByTestId("native-focused-word");
}
async function recordWord(focus:import("@playwright/test").Locator){
 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await focus.getByRole("button",{name:"停止单词录音"}).waitFor();
 await new Promise(resolve=>setTimeout(resolve,1400));
 await focus.getByRole("button",{name:"停止单词录音"}).click();
 await expect(focus.getByText(/单词得分/)).toContainText("72");
}

test("A/B uses two independent real microphone Blobs, rotates only after success",async({page})=>{
 test.setTimeout(65000);
 const scoreCalls:{path:string;size:number}[]=[];
 const focus=await openFocusedWord(page,scoreCalls);
 await recordWord(focus);
 const first=await focus.getByLabel("我的单词录音回听").getAttribute("src");
 expect(first).toMatch(/^blob:/);
 await expect(focus.getByLabel("上一次单词录音（A）")).toHaveCount(0);

 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await expect(focus.getByLabel("我的单词录音回听")).toHaveAttribute("src",first!);
 await focus.getByRole("button",{name:"停止单词录音"}).waitFor();
 await page.waitForTimeout(1400);
 await focus.getByRole("button",{name:"停止单词录音"}).click();
 await expect(focus.getByLabel("上一次单词录音（A）")).toHaveAttribute("src",first!);
 await expect(focus.getByText(/单词得分/)).toContainText("72");
 const second=await focus.getByLabel("我的单词录音回听").getAttribute("src");
 expect(second).toMatch(/^blob:/);expect(second).not.toBe(first);
 const lengths=await page.evaluate(async urls=>Promise.all(urls.map(async url=>(await (await fetch(url)).blob()).size)),[first!,second!]);
 expect(lengths.every(n=>n>1024)).toBeTruthy();

 await focus.getByRole("button",{name:"我听起来这次更清楚"}).click();
 await expect(focus.getByText(/这是自我判断，并非 AI 验证/)).toBeVisible();
 await recordWord(focus);
 await expect(focus.getByLabel("上一次单词录音（A）")).toHaveAttribute("src",second!);
 await expect(focus.getByText(/这是自我判断，并非 AI 验证/)).toHaveCount(0);
 const third=await focus.getByLabel("我的单词录音回听").getAttribute("src");
 expect(third).not.toBe(second);
 expect(third).not.toBe(first);
 await expect.poll(async()=>page.evaluate(async url=>{
  try{await fetch(url);return "still present";}catch{return "revoked";}
 },first!)).toBe("revoked");
 expect(scoreCalls).toHaveLength(4); // one sentence + three actual word uploads
 expect(scoreCalls.slice(1).every(x=>x.path.endsWith("/score-word/octopus")&&x.size>1024)).toBeTruthy();

 // Denied permission must not erase either of the two latest successful takes.
 await page.evaluate(()=>{
  Object.defineProperty(navigator.mediaDevices,"getUserMedia",{
   configurable:true,value:()=>Promise.reject(new DOMException("Permission denied","NotAllowedError")),
  });
 });
 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await expect(focus.getByText(/Permission denied/)).toBeVisible();
 await expect(focus.getByLabel("上一次单词录音（A）")).toHaveAttribute("src",second!);
 await expect(focus.getByLabel("我的单词录音回听")).toHaveAttribute("src",third!);
 await focus.getByRole("button",{name:"curious",exact:true}).click();
 await expect(focus.getByLabel("我的单词录音回听")).toHaveCount(0);
 await expect(focus.getByLabel("上一次单词录音（A）")).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("late microphone permission callback is cancelled on cancel, word change and sentence switch",async({page})=>{
 test.setTimeout(55000);
 const scoreCalls:{path:string;size:number}[]=[];
 const focus=await openFocusedWord(page,scoreCalls);
 await page.evaluate(()=>{
  const media=navigator.mediaDevices;
  const real=media.getUserMedia.bind(media);
  const pending:{stream:MediaStream;release:()=>void}[]=[];
  const state={pending};
  (window as unknown as {__lateMic?:typeof state}).__lateMic=state;
  Object.defineProperty(media,"getUserMedia",{
   configurable:true,
   value:async(constraints:MediaStreamConstraints)=>{
    const stream=await real(constraints);
    return new Promise<MediaStream>(resolve=>pending.push({stream,release:()=>resolve(stream)}));
   },
  });
 });
 await focus.getByRole("button",{name:"录这个词并评分"}).evaluate(button=>{
  // Two synchronous clicks before React can re-render must create one request.
  (button as HTMLButtonElement).click();(button as HTMLButtonElement).click();
 });
 await expect(focus.getByRole("button",{name:"取消等待麦克风"})).toBeVisible();
 await page.waitForFunction(()=>(window as unknown as {__lateMic:{pending:unknown[]}}).__lateMic.pending.length===1);
 await expect(focus.getByRole("button",{name:"curious",exact:true})).toBeDisabled();
 await focus.getByRole("button",{name:"取消等待麦克风"}).click();
 await focus.getByRole("button",{name:"curious",exact:true}).click();
 await page.evaluate(()=>(window as unknown as {__lateMic:{pending:{release:()=>void}[]}}).__lateMic.pending[0].release());
 await expect(focus.getByRole("button",{name:"录这个词并评分"})).toBeEnabled();
 await expect(focus.getByText(/此前的录音仍可回听/)).toHaveCount(0);
 await page.waitForFunction(()=>(window as unknown as {__lateMic:{pending:{stream:MediaStream}[]}}).__lateMic.pending[0].stream.getTracks().every(t=>t.readyState==="ended"));
 await expect(focus.getByLabel("我的单词录音回听")).toHaveCount(0);

 await focus.getByRole("button",{name:"录这个词并评分"}).click();
 await expect(focus.getByRole("button",{name:"取消等待麦克风"})).toBeVisible();
 await page.waitForFunction(()=>(window as unknown as {__lateMic:{pending:unknown[]}}).__lateMic.pending.length===2);
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(page.getByText("蜜蜂分享信息。")).toBeVisible();
 await expect(page.getByTestId("native-focused-word")).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {__lateMic:{pending:{release:()=>void}[]}}).__lateMic.pending[1].release());
 await page.waitForFunction(()=>(window as unknown as {__lateMic:{pending:{stream:MediaStream}[]}}).__lateMic.pending[1].stream.getTracks().every(t=>t.readyState==="ended"));
 expect(scoreCalls).toHaveLength(1); // No stale audio upload after cancellation / unmount.
});
