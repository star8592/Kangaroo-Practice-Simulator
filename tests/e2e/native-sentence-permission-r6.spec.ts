import {expect,test} from "@playwright/test";

const sentence={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus is curious.",translation:"章鱼很好奇。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"测试示范",disclosure:"受控测试",content_origin:"original",
};
const catalog={
 items:[sentence,{...sentence,id:"honeybee-dance",sentence:"Bees share information.",
  translation:"蜜蜂分享信息。",audio_url:"/app/audio/follow-along/honeybee-dance.mp3"}],
 scoring_status:"connected",scoring_message:"测试中不调用真实评分",
};
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",
   "--autoplay-policy=no-user-gesture-required"],
 },
});
type LateMic={
 count:number;
 pending:Array<{stream:MediaStream;release:()=>void}>;
};
async function ready(page:import("@playwright/test").Page){
 const scoringCalls:string[]=[];
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  scoringCalls.push(route.request().url());
  return route.fulfill({status:503,body:"Unexpected late score call"});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("2 句原创语料")).toBeVisible();
 await page.evaluate(()=>{
  const media=navigator.mediaDevices;
  const original=media.getUserMedia.bind(media);
  const state:LateMic={count:0,pending:[]};
  (window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic=state;
  Object.defineProperty(media,"getUserMedia",{
   configurable:true,
   value:async(constraints:MediaStreamConstraints)=>{
    state.count++;
    const stream=await original(constraints);
    return new Promise<MediaStream>(resolve=>state.pending.push({
     stream,release:()=>resolve(stream),
    }));
   },
  });
 });
 return scoringCalls;
}
const micState=(page:import("@playwright/test").Page)=>
 page.evaluate(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.count);

test("sentence: double-click opens one mic request; cancel, change sentence and release late stream",async({page})=>{
 test.setTimeout(45000);
 const scoreCalls=await ready(page);
 await page.getByRole("button",{name:/一键听音/}).evaluate(el=>{
  (el as HTMLButtonElement).click();(el as HTMLButtonElement).click();
 });
 await expect(page.getByRole("button",{name:"取消等待麦克风"})).toBeVisible();
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending.length===1);
 expect(await micState(page)).toBe(1);
 await expect(page.getByRole("button",{name:"下一句"})).toBeDisabled();
 await page.getByRole("button",{name:"取消等待麦克风"}).click();
 await expect(page.getByText(/已取消等待麦克风授权/)).toBeVisible();
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(page.getByText("蜜蜂分享信息。")).toBeVisible();
 await page.evaluate(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[0].release());
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[0].stream.getTracks().every(t=>t.readyState==="ended"));
 await expect(page.getByRole("button",{name:/一键听音/})).toBeEnabled();
 await expect(page.getByRole("region",{name:"Rust 发音评分"})).toHaveCount(0);
 expect(scoreCalls).toHaveLength(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("sentence: permission denied unlocks stage and never fabricates a score",async({page})=>{
 test.setTimeout(35000);
 const scoreCalls=await ready(page);
 await page.evaluate(()=>{
  const media=navigator.mediaDevices;
  Object.defineProperty(media,"getUserMedia",{
   configurable:true,
   value:()=>Promise.reject(new DOMException("Permission denied","NotAllowedError")),
  });
 });
 await page.getByRole("button",{name:/一键听音/}).click();
 await expect(page.getByRole("alert").filter({hasText:"Permission denied"})).toHaveCount(1);
 await expect(page.getByRole("button",{name:/一键听音/})).toBeEnabled();
 await expect(page.getByRole("button",{name:"下一句"})).toBeEnabled();
 await expect(page.getByRole("region",{name:"Rust 发音评分"})).toHaveCount(0);
 expect(scoreCalls).toHaveLength(0);
});

test("sentence: stale permission resolution cannot hijack a newer recording request",async({page})=>{
 test.setTimeout(45000);
 const scoreCalls=await ready(page);
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending.length===1);
 await page.getByRole("button",{name:"取消等待麦克风"}).click();
 await page.getByRole("button",{name:/一键听音/}).click();
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending.length===2);
 expect(await micState(page)).toBe(2);
 await page.evaluate(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[0].release());
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[0].stream.getTracks().every(t=>t.readyState==="ended"));
 await expect(page.getByRole("button",{name:"取消等待麦克风"})).toBeVisible();
 await page.getByRole("button",{name:"取消等待麦克风"}).click();
 await page.evaluate(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[1].release());
 await page.waitForFunction(()=>(window as unknown as {__sentenceLateMic:LateMic}).__sentenceLateMic.pending[1].stream.getTracks().every(t=>t.readyState==="ended"));
 await expect(page.getByRole("button",{name:/一键听音/})).toBeEnabled();
 await expect(page.getByRole("region",{name:"Rust 发音评分"})).toHaveCount(0);
 expect(scoreCalls).toHaveLength(0);
});
