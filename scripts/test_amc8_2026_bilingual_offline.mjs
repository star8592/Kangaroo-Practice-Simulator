import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const file=path.join(root,"private/drafts/maa-amc8-2026-us-bilingual-offline-preview.html");
const paper=JSON.parse(fs.readFileSync(path.join(root,"private/exams/maa-amc8-2026-us-reference-internal.json"),"utf8"));
if(paper.profile.rightsPolicy.commercialUse!==false ||
   paper.questions.length!==25 ||
   paper.questions.some(q=>q.examReady!==false))
  throw Error("INTERNAL_PREVIEW_CANNOT_BE_COMMERCIAL_READY");

const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const tests=[];
const qa=(name,ok)=>{assert.ok(ok,name);tests.push(name);console.log("PASS",name)};
try{
  for(const width of [390,1280]){
    const page=await browser.newPage({viewport:{width,height:880},deviceScaleFactor:1});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto(pathToFileURL(file).href);
    await page.locator("#source").waitFor();
    qa(width+" complete image loads",await page.locator("#source").evaluate(el=>el.complete && el.naturalWidth>1000));
    qa(width+" Chinese source correspondence",
       (await page.locator("#stem").innerText()).includes(paper.questions[0].stem.slice(0,8)));
    qa(width+" actual translated options, not placeholders",
       (await page.getByRole("button",{name:"选择 A"}).innerText()).includes(paper.questions[0].choices[0].label));
    qa(width+" no viewport overflow",await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    qa(width+" 25 question navigation buttons",await page.locator(".nav button").count()===25);
    qa(width+" 40-minute start",await page.locator("#timer").innerText()==="40:00");
    const desktop=width===1280;
    if(desktop){
      let optionMatches=0;
      for(let n=0;n<25;n++){
        await page.locator(".nav button").nth(n).click();
        for(const choice of paper.questions[n].choices){
          const label=await page.getByRole("button",{name:"选择 "+choice.key}).innerText();
          if(label.includes(choice.label) && !label.includes("参见原卷的")) optionMatches++;
        }
        await page.getByRole("button",{name:"选择 "+paper.questions[n].answer}).click();
      }
      qa("125/125 Chinese choice labels genuinely visible",optionMatches===125);
      qa("25 answers registered", (await page.locator("#progress-text").innerText()).includes("25/25"));
      await page.locator("#submit").click();
      qa("perfect score 25/25",await page.locator("#score").innerText()==="25 / 25");
      qa("report is visible",await page.locator("#report").isVisible());
      qa("completed full sheet without JS errors",errors.length===0);
      await page.screenshot({path:"/tmp/amc8-2026-offline-desktop-score.png",fullPage:true});
      await page.locator("#restart").click();
      qa("restart resets attempts",await page.locator("#progress-text").innerText().then(t=>t.includes("0/25")));
    }else{
      await page.locator(".nav button").nth(2).click();
      qa("mobile long Chinese option labels visible",
         (await page.getByRole("button",{name:"选择 E"}).innerText()).includes(paper.questions[2].choices[4].label));
      qa("mobile long-choice question has no horizontal overflow",
         await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      await page.locator(".nav button").last().click();
      await page.waitForFunction(()=>{const img=document.querySelector("#source");return img&&img.complete&&img.naturalWidth>1000});
      qa("final problem image loads",await page.locator("#source").evaluate(el=>el.complete && el.naturalWidth>1000));
      qa("final question title", (await page.locator("#qnumber").innerText()).includes("25 / 25"));
      await page.screenshot({path:"/tmp/amc8-2026-offline-mobile-last.png",fullPage:true});
      qa("mobile question 25 no viewport overflow",await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    }
    qa(width+" no script exceptions",errors.length===0);
    await page.close();
  }
  console.log("AMC8_2026_BILINGUAL_BROWSER="+tests.length+"/"+tests.length+" PASS (file:// internal only)");
}finally{await browser.close()}
