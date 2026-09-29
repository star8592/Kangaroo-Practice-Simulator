#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const [configPath,pdfPath]=process.argv.slice(2);
if(!configPath||!pdfPath)throw new Error("usage: render_arithmetic_pdf_runtime.mjs <config.json> <pdf>");
const {url,cookie,expectedPages}=JSON.parse(fs.readFileSync(configPath,"utf8"));
if(!url||!Number.isInteger(expectedPages)||expectedPages<1)throw new Error("invalid arithmetic PDF config");

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const appRoot=path.resolve(scriptDir,"..");
const runtimeRoot=process.env.SOCTHINK_PDF_RUNTIME_DIR||path.join(appRoot,".runtime","pdf-browser");
const runtimePackage=path.join(runtimeRoot,"package.json");
if(!fs.existsSync(runtimePackage))throw new Error(`PDF runtime not installed: ${runtimeRoot}`);
const require=createRequire(runtimePackage);
const chromiumModule=require("@sparticuz/chromium");
const chromium=chromiumModule.default||chromiumModule;
const puppeteer=require("puppeteer-core");

function flatHtml(images){
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:#fff}.pdf-page{width:210mm;height:297mm;margin:0;overflow:hidden;background:#fff;break-after:page;page-break-after:always}.pdf-page:last-child{break-after:auto;page-break-after:auto}.pdf-page img{display:block;width:210mm;height:297mm;object-fit:fill;background:#fff}</style></head><body>${images.map((src,i)=>`<section class="pdf-page" data-page="${i+1}"><img alt="" src="${src}"></section>`).join("")}</body></html>`;
}

const browser=await puppeteer.launch({
  args:[...chromium.args,"--disable-dev-shm-usage","--disable-features=WebContentsForceDark,AutoDarkMode","--force-color-profile=srgb"],
  executablePath:await chromium.executablePath(),
  headless:"shell",
});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:1600,deviceScaleFactor:1});
  if(cookie)await page.setExtraHTTPHeaders({cookie});
  await page.goto(url,{waitUntil:"networkidle0",timeout:45000});
  await page.emulateMediaType("print");
  await page.emulateMediaFeatures([{name:"prefers-color-scheme",value:"light"}]);
  await page.evaluate(()=>document.fonts?.ready);
  const sheets=await page.$$(".a4-sheet");
  if(sheets.length!==expectedPages)throw new Error(`Expected ${expectedPages} A4 sheets, found ${sheets.length}`);
  const images=[];
  for(const sheet of sheets){
    const jpeg=await sheet.screenshot({type:"jpeg",quality:96,omitBackground:false});
    images.push(`data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`);
  }
  await page.setContent(flatHtml(images),{waitUntil:"load",timeout:30000});
  await page.evaluate(async()=>{await Promise.all([...document.images].filter(x=>!x.complete).map(x=>new Promise((resolve,reject)=>{x.onload=resolve;x.onerror=reject;})))});
  if((await page.$$(".pdf-page")).length!==expectedPages)throw new Error("Flattened page count mismatch");
  await page.pdf({path:pdfPath,format:"A4",printBackground:true,omitBackground:false,preferCSSPageSize:true});
}finally{await browser.close()}
if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000)throw new Error("Runtime browser produced no arithmetic PDF output");
