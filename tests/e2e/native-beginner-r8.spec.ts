import {expect,test} from "@playwright/test";
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {BEGINNER_SHORT_ITEMS} from "../../src/features/english/pronunciation/BeginnerShortData";

const original={
 id:"octopus-flexibility",title:"The Curious Octopus",level:"B1",topic:"Science",
 sentence:"An octopus has no bones, so it can squeeze through surprisingly narrow spaces.",
 translation:"章鱼没有骨头，因此它能够挤过非常狭窄的空间。",
 audio_available:true,audio_url:"/app/audio/follow-along/octopus-flexibility.mp3",
 voice_profile:"Voice",disclosure:"test",content_origin:"original",
};
const catalog={items:[original],scoring_status:"connected",scoring_message:"受控测试"};
function wav(seconds=.65):Buffer{
 const hz=16000,n=Math.round(seconds*hz),b=Buffer.alloc(44+n*2);
 b.write("RIFF",0);b.writeUInt32LE(b.length-8,4);b.write("WAVE",8);
 b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
 b.writeUInt16LE(1,22);b.writeUInt32LE(hz,24);b.writeUInt32LE(hz*2,28);
 b.write("data",36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/hz*2*Math.PI*310)*.32*32767),44+i*2);
 return b;
}
type Call={url:string;header:string|undefined;bytes:number};
test.use({
 permissions:["microphone"],
 launchOptions:{
  executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,
  args:["--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream",
   "--autoplay-policy=no-user-gesture-required"],
 },
});
async function setup(page:import("@playwright/test").Page,returnScore:number|null=82){
 const calls:Call[]=[];
 await page.route("**/english/pronunciation/api/follow-along/items",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify(catalog),
 }));
 await page.route("**/english/pronunciation/app/audio/**",route=>route.fulfill({
  status:200,contentType:"audio/wav",body:wav(),
 }));
 await page.route("**/english/pronunciation/api/follow-along/items/**",route=>{
  calls.push({
   url:route.request().url(),
   header:route.request().headers()["x-english-leap-expected-sentence"],
   bytes:route.request().postDataBuffer()?.byteLength??0,
  });
  if(returnScore===null)return route.fulfill({status:503,body:"Service unavailable"});
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({score:returnScore,transcribe:"THE CAT IS SLEEPING"})});
 });
 await page.goto("/english/pronunciation/next-lab");
 await expect(page.getByText("1 句练习")).toBeVisible();
 return calls;
}

test("R8: original 9-sentence flow remains default; beginner selects ten shorter phrases",async({page})=>{
 await setup(page);
 const picker=page.getByRole("group",{name:"选择练习难度"});
 await expect(picker.getByRole("button",{name:"原有句子"})).toHaveAttribute("aria-pressed","true");
 await picker.getByRole("button",{name:/入门短句/}).click();
 await expect(page.getByText("10 句练习")).toBeVisible();
 const sentence=page.locator('[aria-label="点击任意单词听发音"]');
 await expect(sentence).toContainText("The cat is sleeping.");
 await expect(page.getByText("小猫正在睡觉。")).toBeVisible();
 await expect(page.getByText(/练习提示：先听清楚 cat/)).toBeVisible();
 await page.locator("#native-pronun-speed").selectOption("0.3");
 await expect(page.getByLabel("整句示范音频")).toHaveAttribute("src",
  /beginner-slow-03\/cat-sleeping-one\.mp3$/);
 await page.getByRole("button",{name:"下一句"}).click();
 await expect(sentence).toContainText("The cats are sleeping.");
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 await expect(page.getByRole("group",{name:"选择重点单词"})).toContainText("The cats are sleeping.");
 await expect(page.getByRole("button",{name:"录这个词并评分"})).toBeVisible();
 await page.getByRole("button",{name:"情景问答"}).click();
 await expect(page.getByTestId("native-guided-dialogue").getByText("What are the cats doing?")).toBeVisible();
 await picker.getByRole("button",{name:"原有句子"}).click();
 await expect(page.getByText("1 句练习")).toBeVisible();
 await expect(page.getByTestId("native-guided-dialogue").getByText(/How can an octopus/)).toBeVisible();
 await page.getByRole("button",{name:"基础跟读",exact:true}).click();
 await expect(sentence).toContainText("An octopus has no bones");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(overflow).toBeLessThanOrEqual(2);
});

test("R8: guided beginner response is scored with exact short reference not the old lesson",async({page})=>{
 test.setTimeout(60000);
 const calls=await setup(page,87);
 await page.getByRole("button",{name:/入门短句/}).click();
 await page.getByRole("button",{name:"情景问答",exact:true}).click();
 const q=page.getByTestId("native-guided-dialogue");
 await expect(q.getByText("What is the cat doing?")).toBeVisible();
 await q.getByRole("button",{name:"我来回答并评分"}).click();
 await q.getByRole("button",{name:/停止回答并评分/}).waitFor();
 await page.waitForTimeout(1400);
 await q.getByRole("button",{name:/停止回答并评分/}).click();
 await expect(q.getByLabel("问答发音结果")).toContainText("87");
 expect(calls).toHaveLength(1);
 expect(calls[0].url).toContain("/private-session/score");
 expect(decodeURIComponent(calls[0].header||"")).toBe("The cat is sleeping.");
 expect(calls[0].bytes).toBeGreaterThan(1000);
 await page.getByRole("button",{name:"原有句子"}).click();
 await expect(q.getByLabel("问答发音结果")).toHaveCount(0);
});

test("R8: individual beginner word uses private-session word route and target header",async({page})=>{
 test.setTimeout(60000);
 const calls=await setup(page,76);
 await page.getByRole("button",{name:/入门短句/}).click();
 await page.getByRole("button",{name:"单词专项",exact:true}).click();
 const word=page.getByTestId("native-focused-word");
 await word.getByRole("group",{name:"选择重点单词"}).getByRole("button",{name:"cat",exact:true}).click();
 await word.getByRole("button",{name:"录这个词并评分"}).click();
 await word.getByRole("button",{name:"停止单词录音"}).waitFor();
 await page.waitForTimeout(1400);
 await word.getByRole("button",{name:"停止单词录音"}).click();
 await expect(word.getByText(/单词得分/)).toContainText("76");
 expect(calls).toHaveLength(1);
 expect(calls[0].url).toContain("/private-session/score-word/cat");
 expect(decodeURIComponent(calls[0].header||"")).toBe("The cat is sleeping.");
});

test("R8: scoring failure leaves no fabricated percent result",async({page})=>{
 test.setTimeout(60000);
 const calls=await setup(page,null);
 await page.getByRole("button",{name:/入门短句/}).click();
 await page.getByRole("button",{name:"情景问答",exact:true}).click();
 const q=page.getByTestId("native-guided-dialogue");
 await q.getByRole("button",{name:"我来回答并评分"}).click();
 await q.getByRole("button",{name:/停止回答并评分/}).waitFor();
 await page.waitForTimeout(1400);
 await q.getByRole("button",{name:/停止回答并评分/}).click();
 await expect(q.getByLabel("问答发音结果")).toHaveCount(0);
 await expect(page.getByText(/这次没有打出分数/)).toBeVisible();
 expect(calls).toHaveLength(1);
});

test("R8: all 10 pre-rendered 0.3x tracks match their SHA manifest and exposed URLs",async({page})=>{
 const root=resolve(process.cwd(),"public/english/pronunciation/next-lab/audio/beginner-slow-03");
 const manifest=JSON.parse(readFileSync(resolve(root,"manifest.json"),"utf8")) as {
  items:{id:string;source_sha256:string;output_file:string;output_sha256:string;slow_seconds:number}[];
 };
 expect(manifest.items).toHaveLength(BEGINNER_SHORT_ITEMS.length);
 for(const item of BEGINNER_SHORT_ITEMS){
  const record=manifest.items.find(r=>r.id===item.id);
  expect(record,`slow manifest must contain ${item.id}`).toBeDefined();
  expect(record?.source_sha256).toBe(item.audioSha256);
  const file=resolve(root,item.id+".mp3");
  expect(statSync(file).size).toBeGreaterThan(4000);
  expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(record?.output_sha256);
  expect(record?.slow_seconds).toBeGreaterThan(5);
  const web=await page.request.get("/english/pronunciation/next-lab/audio/beginner-slow-03/"+item.id+".mp3");
  expect(web.status(),item.id).toBe(200);
  expect(web.headers()["content-type"]).toContain("audio/mpeg");
 }
});

test("R8: optional cue audio outage cannot block a consented beginner recording",async({page})=>{
 test.setTimeout(60000);
 const calls=await setup(page,84);
 await page.route("**/english/pronunciation/app/audio/ui/ready-ding-single.wav",route=>
  route.fulfill({status:404,body:"missing cue"}));
 await page.getByRole("button",{name:/入门短句/}).click();
 await page.getByRole("button",{name:"情景问答",exact:true}).click();
 const q=page.getByTestId("native-guided-dialogue");
 await q.getByRole("button",{name:"我来回答并评分"}).click();
 await q.getByRole("button",{name:/停止回答并评分/}).waitFor();
 await expect(page.getByText(/提示音没响，但录音已经开始/)).toBeVisible();
 await page.waitForTimeout(1400);
 await q.getByRole("button",{name:/停止回答并评分/}).click();
 await expect(q.getByLabel("问答发音结果")).toContainText("84");
 expect(calls).toHaveLength(1);
 expect(decodeURIComponent(calls[0].header||"")).toBe("The cat is sleeping.");
});
