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

const browser=await puppeteer.launch({
  args:[...chromium.args,"--disable-dev-shm-usage","--disable-features=WebContentsForceDark,AutoDarkMode","--force-color-profile=srgb"],
  executablePath:await chromium.executablePath(),
  headless:"shell",
});
try{
  const page=await browser.newPage();
  const html=fs.readFileSync(htmlPath,"utf8");
  await page.emulateMediaType("print");
  await page.emulateMediaFeatures([{name:"prefers-color-scheme",value:"light"}]);
  await page.setContent(html,{waitUntil:"load",timeout:30000});
  await page.addStyleTag({content:"html,body{background:#fff!important;color:#17211c!important;color-scheme:light!important}.diagnostic-report{background:#fff!important}.diagnostic-report .report-page{background:#fff!important;color:#17211c!important}"});
  await page.evaluate(()=>{
    document.documentElement.style.background="#fff";
    document.documentElement.style.colorScheme="light";
    document.body.style.background="#fff";
    document.body.style.colorScheme="light";
  });
  await page.evaluate(()=>document.fonts?.ready);
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
