import crypto from "node:crypto";
import {chromium} from "playwright";

const origin=process.env.SOCTHINK_MARKETPLACE_PUBLIC_ORIGIN;
const secret=process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET;
const examId=process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID;
if(!origin||!secret||!examId)throw Error("LOCAL_QA_ENV_REQUIRED");
const token=(suffix)=>{
 const claims={v:1,job:"ui_qa_20261118_"+suffix,sku:"EDU-001",kind:"EXAM_REPORT_ONCE",
   examId,exp:Math.floor(Date.now()/1000)+300};
 const raw=Buffer.from(JSON.stringify(claims)).toString("base64url");
 return raw+"."+crypto.createHmac("sha256",secret).update(raw).digest("hex");
};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let checks=0;
const check=(name,assertion)=>{if(!assertion)throw Error(name);checks++;console.log("PASS",name)};
try{
 for(const width of [320,360,390,430,768]){
   const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,
      isMobile:width<500,hasTouch:true,locale:"zh-CN",acceptDownloads:true});
   const page=await context.newPage();
   const jsErrors=[];
   page.on("pageerror",e=>jsErrors.push(e.message));
   const claim=origin+"/marketplace/claim?ticket="+encodeURIComponent(token("viewport_"+width));
   await page.goto(claim,{waitUntil:"domcontentloaded",timeout:45000});
   await page.getByRole("button",{name:"领取考试并继续"}).waitFor({timeout:15000});
   const hasClaimOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   check("claim no horizontal overflow "+width,!hasClaimOverflow);
   await page.screenshot({path:"/tmp/amc8-mobile-claim-"+width+".png",fullPage:true});
   await page.getByRole("button",{name:"领取考试并继续"}).click();
   try { await page.waitForURL("**/exam/**",{waitUntil:"domcontentloaded",timeout:15000}); } catch(e){console.log("UI_NAV_DEBUG",width,page.url(),(await page.locator("body").innerText()).slice(0,700));throw e;}
   await page.locator(".candidate-start").click({timeout:20000});
   try{await page.locator(".question-card").waitFor({timeout:12000});}catch(e){console.log("CANDIDATE_START_DEBUG",width,page.url(),(await page.locator("body").innerText()).slice(0,850),jsErrors);throw e;}
   const realExamOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
   check("real exam no horizontal overflow "+width,!realExamOverflow);
   await page.screenshot({path:"/tmp/amc8-mobile-exam-"+width+".png",fullPage:true});
   const first=page.locator(".choice").first();
   await first.click();
   check("answer selected "+width,await first.evaluate(el=>el.classList.contains("selected")));
   await page.locator(".question-footer .primary-button").click();
   check("real next question "+width,(await page.locator(".q-number").innerText()).includes("2"));
   check("no JS page errors "+width,jsErrors.length===0);
   if(width===390){
     await context.setOffline(true);
     await page.locator(".question-footer .secondary-button").click();
     check("offline answers remain visible in browser", (await page.locator(".q-number").innerText()).includes("1"));
     await context.setOffline(false);
     await page.reload({waitUntil:"domcontentloaded"});
     await page.locator(".candidate-start").click();
     await page.locator(".question-card").waitFor();
     check("refresh returns same full exam",await page.locator(".number-grid button").count()===25);
     const images=page.locator(".question-asset");
     if(await images.count()){
       const loaded=await images.first().evaluate(x=>x.complete && x.naturalWidth>0);
       check("real question image loads",loaded);
     }
     await page.locator(".exam-topbar .ghost-button").click();
     await page.locator(".submit-modal .primary-button").click();
     await page.waitForURL("**/result",{timeout:45000});
     const last=await page.evaluate(()=>JSON.parse(localStorage.getItem("math-competition-last-attempt")||"null"));
     const attempt=last?.grade?.attemptId;
     check("client submit stores real attemptId",typeof attempt==="string" && attempt.startsWith("att_"));
     await page.goto(origin+"/report/"+encodeURIComponent(attempt),{waitUntil:"domcontentloaded"});
     check("real report rendered",await page.getByText("数学竞赛学习诊断报告").count()>0);
     await page.screenshot({path:"/tmp/amc8-mobile-report-390.png",fullPage:true});
     const pdf=await context.request.get(origin+"/api/reports/"+encodeURIComponent(attempt)+"/pdf",{timeout:55000});
     const bytes=await pdf.body();
     check("real pdf download still works on mobile session",pdf.ok() && bytes.subarray(0,4).toString()==="%PDF");
   }
   await context.close();
 }
 console.log("MOBILE_CHROMIUM_QA="+checks+"/"+checks+" PASS");
}finally{await browser.close()}
