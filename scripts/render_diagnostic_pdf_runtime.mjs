#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const [htmlPath,pdfPath]=process.argv.slice(2);
if(!htmlPath||!pdfPath)throw new Error("usage: render_diagnostic_pdf_runtime.mjs <html> <pdf>");

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const appRoot=path.resolve(scriptDir,"..");
const runtimeRoot=process.env.SOCTHINK_PDF_RUNTIME_DIR||path.join(appRoot,".runtime","pdf-browser");
const runtimePackage=path.join(runtimeRoot,"package.json");
if(!fs.existsSync(runtimePackage))throw new Error(`PDF runtime not installed: ${runtimeRoot}`);

const runtimeTmp=path.join(runtimeRoot,"tmp");
fs.mkdirSync(runtimeTmp,{recursive:true});
process.env.TMPDIR=runtimeTmp;

const require=createRequire(runtimePackage);
const chromiumModule=require("@sparticuz/chromium");
const chromium=chromiumModule.default||chromiumModule;
const puppeteer=require("puppeteer-core");

const WHITE_STYLE="html,body{background:#fff!important;color:#17211c!important;color-scheme:light!important}.diagnostic-report{background:#fff!important}.diagnostic-report .report-page{background:#fff!important;color:#17211c!important}";
const isWhite=value=>value==="rgb(255, 255, 255)"||value==="rgba(255, 255, 255, 1)";

async function forceLight(page){
  await page.emulateMediaType("print");
  await page.emulateMediaFeatures([{name:"prefers-color-scheme",value:"light"}]);
  await page.addStyleTag({content:WHITE_STYLE});
  await page.evaluate(()=>{
    document.documentElement.style.background="#fff";
    document.documentElement.style.colorScheme="light";
    document.body.style.background="#fff";
    document.body.style.colorScheme="light";
  });
}

function flattenedHtml(images){
  const pages=images.map((src,index)=>`<section class="pdf-page" data-page="${index+1}"><img alt="" src="${src}"></section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:0}
    html,body{margin:0!important;padding:0!important;background:#fff!important;color-scheme:light!important}
    .pdf-page{width:210mm;height:297mm;margin:0;overflow:hidden;background:#fff!important;break-after:page;page-break-after:always}
    .pdf-page:last-child{break-after:auto;page-break-after:auto}
    .pdf-page img{display:block;width:210mm;height:297mm;object-fit:fill;background:#fff!important}
  </style></head><body>${pages}</body></html>`;
}

const browser=await puppeteer.launch({
  args:[...chromium.args,"--disable-dev-shm-usage","--disable-features=WebContentsForceDark,AutoDarkMode","--force-color-profile=srgb"],
  executablePath:await chromium.executablePath(),
  headless:"shell",
});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:1600,deviceScaleFactor:1});
  const html=fs.readFileSync(htmlPath,"utf8");
  await page.setContent(html,{waitUntil:"load",timeout:30000});
  await forceLight(page);
  await page.evaluate(()=>document.fonts?.ready);

  const backgrounds=await page.evaluate(()=>{
    const nodes=[document.documentElement,document.body,...document.querySelectorAll(".diagnostic-report .report-page")];
    return nodes.map(node=>getComputedStyle(node).backgroundColor);
  });
  if(backgrounds.length<3||!backgrounds.every(isWhite)){
    throw new Error(`Diagnostic PDF background must be white: ${backgrounds.join(", ")}`);
  }

  const reportPages=await page.$$(".diagnostic-report .report-page");
  if(!reportPages.length)throw new Error("Diagnostic report has no printable pages");

  // Rasterize each complete A4 report page onto an opaque white JPEG before
  // packaging it into the PDF. This prevents mobile PDF night-mode engines
  // from replacing only the page canvas with black while leaving dark text.
  const images=[];
  for(const reportPage of reportPages){
    const jpeg=await reportPage.screenshot({type:"jpeg",quality:96,omitBackground:false});
    images.push(`data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`);
  }

  await page.setContent(flattenedHtml(images),{waitUntil:"load",timeout:30000});
  await forceLight(page);
  await page.evaluate(async()=>{
    const pending=[...document.images].filter(img=>!img.complete).map(img=>new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}));
    await Promise.all(pending);
  });

  const flattenedBackgrounds=await page.evaluate(()=>[
    getComputedStyle(document.documentElement).backgroundColor,
    getComputedStyle(document.body).backgroundColor,
    ...[...document.querySelectorAll(".pdf-page")].map(node=>getComputedStyle(node).backgroundColor),
  ]);
  if(!flattenedBackgrounds.every(isWhite)){
    throw new Error(`Flattened diagnostic PDF background must be white: ${flattenedBackgrounds.join(", ")}`);
  }

  await page.pdf({
    path:pdfPath,
    format:"A4",
    printBackground:true,
    omitBackground:false,
    preferCSSPageSize:true,
  });
}finally{
  await browser.close();
}

if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000){
  throw new Error("Runtime browser produced no PDF output");
}
