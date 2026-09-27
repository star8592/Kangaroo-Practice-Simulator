import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function systemChrome(){
  const configured=process.env.CHROME_BIN?.trim();
  const candidates=configured?[configured]:["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"];
  return candidates.find(candidate=>fs.existsSync(candidate))||null;
}

function renderWithSystemChrome(html:string,chrome:string){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"math-diagnostic-pdf-"));
  const htmlPath=path.join(dir,"report.html");
  const pdfPath=path.join(dir,"report.pdf");
  const profilePath=path.join(dir,"chrome-profile");
  try{
    fs.writeFileSync(htmlPath,html,"utf8");
    execFileSync(/* turbopackIgnore: true */ chrome,[
      "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--allow-file-access-from-files",
      "--no-pdf-header-footer",`--user-data-dir=${profilePath}`,`--print-to-pdf=${pdfPath}`,`file://${htmlPath}`,
    ],{timeout:45000,stdio:"pipe",env:{...process.env,HOME:dir}});
    if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000)throw new Error("PDF output missing");
    return fs.readFileSync(pdfPath);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
}

async function renderWithBundledChromium(html:string){
  chromium.setGraphicsMode=false;
  const browser=await puppeteer.launch({
    args:[...chromium.args,"--disable-dev-shm-usage"],
    executablePath:await chromium.executablePath(),
    headless:"shell",
  });
  try{
    const page=await browser.newPage();
    await page.setContent(html,{waitUntil:"load",timeout:30000});
    await page.evaluate(()=>document.fonts?.ready);
    const pdf=await page.pdf({format:"A4",printBackground:true,preferCSSPageSize:true});
    if(pdf.length<1000)throw new Error("PDF output missing");
    return Buffer.from(pdf);
  }finally{await browser.close()}
}

export async function renderDiagnosticReportPdfFromHtml(html:string){
  const chrome=systemChrome();
  if(chrome)return renderWithSystemChrome(html,chrome);
  return renderWithBundledChromium(html);
}
