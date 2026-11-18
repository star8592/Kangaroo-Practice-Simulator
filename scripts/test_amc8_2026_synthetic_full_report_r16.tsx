import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {NextRequest} from "next/server";
import {execFileSync} from "node:child_process";
import {isStackedBilingualExam,questionsPerDiagnosticPage} from "../src/lib/bilingual-original";
import {DIAGNOSTIC_REPORT_CSS} from "../src/lib/diagnostic-report-style";
import {BILINGUAL_ORIGINAL_REPORT_CSS} from "../src/lib/bilingual-original-report-style";
import {embedLocalReportImages} from "../src/lib/diagnostic-report-embed-assets";
import DiagnosticReportView from "../src/components/DiagnosticReportView";
import {renderDiagnosticReportPdfFromHtml} from "../src/lib/diagnostic-report-pdf";
import zlib from "node:zlib";

function crc32(buf:Buffer){
 let c=0xffffffff;
 for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}
 return (c^0xffffffff)>>>0;
}
function chunk(name:string,data:Buffer){
 const type=Buffer.from(name,"ascii"),len=Buffer.alloc(4),sum=Buffer.alloc(4);
 len.writeUInt32BE(data.length);
 sum.writeUInt32BE(crc32(Buffer.concat([type,data])));
 return Buffer.concat([len,type,data,sum]);
}
function syntheticSourcePng(){
 const w=420,h=220,raw=Buffer.alloc((w*3+1)*h,255);
 for(let y=0;y<h;y++){
  const off=y*(w*3+1);raw[off]=0;
  for(let x=0;x<w;x++){
   const i=off+1+x*3;
   const dark=x===60||x===360||y===60||y===160||Math.abs(x-y*2)<2;
   raw[i]=dark?20:255;raw[i+1]=dark?44:255;raw[i+2]=dark?80:255;
  }
 }
 const hbuf=Buffer.alloc(13);hbuf.writeUInt32BE(w,0);hbuf.writeUInt32BE(h,4);hbuf[8]=8;hbuf[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",hbuf),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}

async function main(){
 const originalCwd=process.cwd();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-amc8-r16-synthetic-"));
 const publicDir=path.join(tmp,"public","local-assets","qa");
 fs.mkdirSync(publicDir,{recursive:true});
 const qaFile=path.join(publicDir,"synthetic-source.png");
 fs.writeFileSync(qaFile,syntheticSourcePng());
 process.env.SOCTHINK_USER_DATA_DIR=path.join(tmp,"private","users");
 process.chdir(tmp);
 try{
  const auth=await import("../src/lib/auth");
  const sessions=await import("../src/lib/exam-session");
  const attemptStore=await import("../src/lib/attempt-store");
  const {POST}=await import("../src/app/api/grade/route");
  const {buildReviewAttempt}=await import("../src/lib/review-attempt");
  const {buildDiagnosticReport}=await import("../src/lib/diagnostic-report");
  const examId="amc8-r16-original-stack-synthetic-not-real-licensed";
  const questionImage="/local-assets/qa/synthetic-source.png";
  const questions=Array.from({length:25},(_,i)=>({
   id:"synthetic-q"+(i+1),year:2026,level:"QA",grades:"8",language:"zh/en",
   questionNo:i+1,points:1,answerMode:"choice",concept:"qa_synthetic",
   stem:"这是第"+(i+1)+"题的原创合成中文测试题干，不是真实赛事题。",
   stemEn:"Original synthetic sample image and demonstration options.",
   choices:[{key:"A",label:"合成选项甲"},{key:"B",label:"合成选项乙"},{key:"C",label:"合成选项丙"}],
   choicesEn:[{key:"A",label:"Synthetic A"},{key:"B",label:"Synthetic B"},{key:"C",label:"Synthetic C"}],
   answer:"B",solution:"合成题正确答案B，仅测试评分和报告。",
   assetUrl:questionImage,assetUrlZh:questionImage,assetUrlEn:questionImage,
   studentAssetUrl:questionImage,studentAssetUrlEn:questionImage,
   verified:true,examReady:true,
   review:{translationStatus:"source-verified",verified:true,visualVerified:true,needsReview:false}
  }));
  const profile={
   id:examId,name:"Synthetic QA AMC8 bilingual past-paper layout",
   nameZh:"合成测试：中英原卷上下对照",nameEn:"Synthetic bilingual original QA",
   country:"internal",year:2026,grades:"8",competitionId:"maa-amc",formatId:"maa-amc8",
   paperType:"past",language:"zh-en-stacked",questionCount:25,
   durationSeconds:2400,initialScore:0,maxScore:25,
   wrongPenaltyMode:"fixed",wrongPenaltyValue:0,blankScoreValue:0,timingMode:"official",
   rightsPolicy:{commercialUse:false,publicQuestionDisplay:false}
  };
  assert.equal(isStackedBilingualExam(profile),true);
  const fixtureDir=path.join(tmp,"private","exams");fs.mkdirSync(fixtureDir,{recursive:true});
  fs.writeFileSync(path.join(fixtureDir,examId+".json"),JSON.stringify({profile,questions}));
  const student=auth.createStudent({username:"amc8_r16_synthetic",candidateNo:"R16-SYNTHETIC",
    name:"合成考试用户",grade:8,pin:"1234"});
  const token=auth.createSessionToken(student.id);
  const session=sessions.startExamSession(student.id,examId,2400).session;
  const answers=Object.fromEntries(questions.map(q=>[q.id,"B"]));
  const req=new NextRequest("https://socthink.cn/api/grade",{
   method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},
   body:JSON.stringify({examId,sessionId:session.id,answers,events:[],lang:"zh"})
  });
  const res=await POST(req);
  assert.equal(res.status,200,"real grade route must accept synthetic 25-question bundle");
  const data=await res.json();
  assert.equal(data.score,25);
  assert.equal(data.correct,25);
  assert.equal(data.blank,0);
  console.log("PASS synthetic 25Q 40min exam via actual grade route, score=25/25");
  const stored=attemptStore.loadExamAttempts(student.id,20);
  assert.equal(stored.length,1);
  assert.equal(stored[0].questions.length,25);
  assert.equal(stored[0].profile.language,"zh-en-stacked");
  console.log("PASS persisted 25Q exact student attempt and bilingual profile");
  const review=buildReviewAttempt(student,data.attemptId);
  assert.equal(review?.questions.length,25);
  assert.equal(review?.profile?.language,"zh-en-stacked");
  assert.ok(review?.questions.every(q=>q.assetUrlEn===questionImage));
  console.log("PASS history review retains 25 bilingual original-image records");
  const report=buildDiagnosticReport(student,data.attemptId);
  assert.ok(report);
  assert.equal(report.questions.length,25);
  assert.equal(report.exam.language,"zh-en-stacked");
  assert.equal(questionsPerDiagnosticPage(report.exam),1);
  console.log("PASS original diagnostic report generated 25 bilingual question entries");
  const reportHtml=renderToStaticMarkup(React.createElement(DiagnosticReportView,{report}));
  assert.equal((reportHtml.match(/class="report-page"/g)||[]).length,30);
  assert.equal((reportHtml.match(/bilingual-original-image/g)||[]).length,25);
  console.log("PASS real React report has 30 print pages with 25 source image elements");
  const document='<!doctype html><html lang="zh"><head><meta charset="utf-8"/><style>'+
   DIAGNOSTIC_REPORT_CSS+BILINGUAL_ORIGINAL_REPORT_CSS+'</style></head><body>'+reportHtml+'</body></html>';
  const inlined=embedLocalReportImages(document,path.join(tmp,"public","local-assets"));
  assert.equal((inlined.match(/data:image\/png;base64,/g)||[]).length,25);
  assert.equal((inlined.match(/src="\/local-assets\//g)||[]).length,0);
  console.log("PASS 25 source figures all embedded in authorized report HTML without remote file access");
  if(process.argv.includes("--render-pdf")){
   const pdf=renderDiagnosticReportPdfFromHtml(inlined);
   assert.ok(pdf.length>100000);
   const out=path.join(tmp,"r16-full.pdf");fs.writeFileSync(out,pdf);
   const info=execFileSync("pdfinfo",[out],{encoding:"utf8"});
   const pageCount=Number(/^Pages:\s+(\d+)$/m.exec(info)?.[1]);
   assert.equal(pageCount,30,"25 bilingual question pages plus 5 diagnostic pages");
   console.log("PASS actual 30-page diagnostic PDF, size="+pdf.length+" bytes");
   if(process.argv.includes("--save-qa-pdf")){
    const dest="/tmp/amc8-r16-synthetic-30-page-report.pdf";
    fs.writeFileSync(dest,pdf);
    console.log("SYNTHETIC_QA_PDF",dest);
   }
  }
  console.log("AMC8_R16_SYNTHETIC_FULL_STACK=PASS original_paper_content_used=NO");
 }finally{
  process.chdir(originalCwd);
  fs.rmSync(tmp,{recursive:true,force:true});
 }
}
main().catch(error=>{console.error("AMC8_R16_SYNTHETIC_FULL_STACK=FAIL",error);process.exitCode=1});
