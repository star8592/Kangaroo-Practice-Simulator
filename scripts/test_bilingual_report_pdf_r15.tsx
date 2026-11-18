import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {execFileSync} from "node:child_process";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import BilingualOriginalQuestion from "../src/components/BilingualOriginalQuestion";
import {BILINGUAL_ORIGINAL_REPORT_CSS} from "../src/lib/bilingual-original-report-style";
import {DIAGNOSTIC_REPORT_CSS} from "../src/lib/diagnostic-report-style";
import {renderDiagnosticReportPdfFromHtml} from "../src/lib/diagnostic-report-pdf";

function main(){
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="490">'+
  '<rect width="1050" height="490" fill="white"/>'+
  '<text x="30" y="70" fill="black" font-size="30">Q1: Synthetic original English geometry problem</text>'+
  '<path d="M200 380 L525 120 L830 380 Z" stroke="black" fill="none" stroke-width="10"/>'+
  '<text x="40" y="450" fill="black" font-size="26">(A) 30  (B) 45  (C) 60  (D) 75  (E) 90</text>'+
  '</svg>';
 const img="data:image/svg+xml;base64,"+Buffer.from(svg).toString("base64");
 const component=renderToStaticMarkup(React.createElement(BilingualOriginalQuestion,{
  chinese:"这是专门用于报告排版测试的中文几何题，不包含任何官方试题。",
  originalImage:img,questionNo:1,compact:true,
 }));
 const html='<!doctype html><html lang="zh"><head><meta charset="utf-8"/>'+
  '<style>'+DIAGNOSTIC_REPORT_CSS+BILINGUAL_ORIGINAL_REPORT_CSS+'</style></head><body>'+
  '<div class="diagnostic-report"><section class="report-page">'+
  '<div class="dr-topline"><div class="dr-brand"><div class="dr-mark">M</div><div>内部中文/英文逐题排版验证</div></div></div>'+
  '<div class="dr-section"><h2>Q1 样例</h2>'+component+
  '<div class="dr-review-evidence">样例答案（人工制作测试） · C</div></div>'+
  '</section></div></body></html>';
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"amc8-r15-pdf-"));
 try{
  const pdf=renderDiagnosticReportPdfFromHtml(html);
  assert.ok(pdf.byteLength>5000,"PDF must not be blank");
  const file=path.join(tmp,"bilingual-qa.pdf");fs.writeFileSync(file,pdf);
  const info=execFileSync("pdfinfo",[file],{encoding:"utf8"});
  const pages=/^Pages:\s+(\d+)$/m.exec(info);
  assert.equal(Number(pages?.[1]),1,"one bilingual source question should fit exactly one report page");
  const raster=path.join(tmp,"page");
  execFileSync("pdftoppm",["-f","1","-l","1","-scale-to","950","-png","-singlefile",file,raster]);
  const png=fs.readFileSync(raster+".png");
  assert.ok(png.length>25000,"printed page raster must preserve original source figure");
  const dest="/tmp/amc8-r15-synthetic-bilingual-report.pdf";
  fs.copyFileSync(file,dest);
  console.log("AMC8_BILINGUAL_PDF_R15=PASS pages=1 bytes="+pdf.byteLength+" raster_bytes="+png.length);
  console.log("PDF_SYNTHETIC_ONLY="+dest);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
main();
