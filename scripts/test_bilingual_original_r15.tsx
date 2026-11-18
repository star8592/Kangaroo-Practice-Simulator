import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {chromium} from "playwright";
import BilingualOriginalQuestion from "../src/components/BilingualOriginalQuestion";
import {isStackedBilingualExam,questionsPerDiagnosticPage} from "../src/lib/bilingual-original";
import {isExamBundleTrainingReady} from "../src/lib/training-question-bank";
import type {ExamBundle} from "../src/lib/types";

async function main(){
const root=path.resolve(process.cwd());
const css=fs.readFileSync(path.join(root,"src/app/globals.css"),"utf8");
const syntheticSvg='<svg xmlns="http://www.w3.org/2000/svg" width="950" height="430" viewBox="0 0 950 430">'+
'<rect width="950" height="430" fill="#fff"/>'+
'<text x="38" y="58" font-family="sans-serif" font-size="28">1. Sample (original-style) English maths question</text>'+
'<text x="38" y="116" font-family="sans-serif" font-size="25">What is the angle of this shape?</text>'+
'<polygon points="240,330 410,155 560,330" fill="none" stroke="#182d47" stroke-width="6"/>'+
'<text x="38" y="400" font-family="sans-serif" font-size="22">(A) 30    (B) 45    (C) 60    (D) 75    (E) 90</text></svg>';
const image="data:image/svg+xml;base64,"+Buffer.from(syntheticSvg).toString("base64");
let passed=0;
const assertCheck=(name: string,condition: boolean)=>{assert.ok(condition,name);passed++;console.log("PASS",name)};
assertCheck("stacked mode is explicitly opt-in",isStackedBilingualExam({language:"zh-en-stacked",paperType:"past"}));
assertCheck("normal Chinese and English switching stays unchanged",!isStackedBilingualExam({language:"zh/en",paperType:"past"}));
assertCheck("training mock cannot silently impersonate bilingual original",!isStackedBilingualExam({language:"zh-en-stacked",paperType:"practice"}));
assertCheck("stacked report uses one question per page",questionsPerDiagnosticPage({language:"zh-en-stacked",paperType:"past"})===1);
assertCheck("legacy report remains three questions per page",questionsPerDiagnosticPage({language:"en",paperType:"past"})===3);
const syntheticQa=JSON.parse(fs.readFileSync(path.join(root,"tests/fixtures/marketplace-amc8-original-qa.json"),"utf8")) as ExamBundle;
const internalCopy=JSON.parse(JSON.stringify(syntheticQa)) as ExamBundle;
internalCopy.profile.language="zh-en-stacked";
internalCopy.profile.paperType="past";
assertCheck("unverified source images block stacked official exam loading",
  !isExamBundleTrainingReady(internalCopy));
internalCopy.questions.forEach(q=>{q.assetUrlEn="/local-assets/qa-source/q01.png"});
assertCheck("source image manifests keep training QA domain gate independent",
  isExamBundleTrainingReady(internalCopy));
const html=renderToStaticMarkup(React.createElement(BilingualOriginalQuestion,{
 chinese:"求图中三角形的角度。","english":"Original placeholder must not replace source image",
 originalImage:image,questionNo:11,
}));
assertCheck("real render has Chinese translation",html.includes("求图中三角形的角度"));
assertCheck("real render has original English heading",html.includes("Original English"));
assertCheck("real render keeps source-image alt",html.includes("original English text, options and diagrams"));
assertCheck("real render does not misrepresent placeholder English as original",!html.includes("Original placeholder must not"));
const missing=renderToStaticMarkup(React.createElement(BilingualOriginalQuestion,{
 chinese:"中文译文",english:"English fallback, not original diagram",questionNo:12,
}));
assertCheck("missing original image shown as explicit failure",missing.includes("原版题图缺失"));
assertCheck("source fallback never fabricates an image",!missing.includes("<img"));
const injected=renderToStaticMarkup(React.createElement(BilingualOriginalQuestion,{
 chinese:"<img src=x onerror=alert(1)>",originalImage:image,questionNo:1,
}));
assertCheck("translator text is escaped not interpreted as HTML",injected.includes("&lt;img")&&!injected.includes('<img src="x"'));
if (process.argv.includes("--ci-no-browser")) {
  console.log("AMC8_STACKED_R15_CI="+passed+"/"+passed+" PASS (SSR + safety + history mode)");
  return;
}
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for (const width of [320,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.setContent('<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
     '<main style="box-sizing:border-box;max-width:1100px;margin:0 auto;padding:12px"><div class="question-card" style="padding:14px">'+html+'</div></main></body></html>');
  await page.waitForFunction(()=>{const img=document.querySelector<HTMLImageElement>(".bilingual-original-image");return img&&img.complete&&img.naturalWidth>800});
  assertCheck(width+"px source illustration loaded",await page.locator(".bilingual-original-image").evaluate(el=>(el as HTMLImageElement).naturalWidth===950));
  assertCheck(width+"px no horizontal overflow",await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  assertCheck(width+"px Chinese before English in DOM",await page.evaluate(()=>{
    const a=document.querySelector(".bilingual-original-translation");
    const b=document.querySelector(".bilingual-original-source");
    return !!(a&&b&&a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  assertCheck(width+"px no JS errors",errors.length===0);
  if(width===390||width===1280)await page.screenshot({path:"/tmp/amc8-r15-stacked-"+width+".png",fullPage:true});
  await page.close();
 }
}finally{await browser.close()}
console.log("AMC8_STACKED_R15_ALL_CHECKS="+passed+"/"+passed+" PASS; synthetic shapes only, no historical paper assets");

}
main().catch(e=>{console.error(e);process.exitCode=1});
