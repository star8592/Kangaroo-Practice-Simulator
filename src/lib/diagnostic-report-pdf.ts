import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function systemChrome(){
  const configured=process.env.CHROME_BIN?.trim();
  const candidates=configured?[configured]:[
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find(candidate=>fs.existsSync(candidate))||null;
}

function renderWithChrome(htmlPath:string,pdfPath:string,profilePath:string,chrome:string,home:string){
  execFileSync(/* turbopackIgnore: true */ chrome,[
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--allow-file-access-from-files",
    "--no-pdf-header-footer",
    `--user-data-dir=${profilePath}`,
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ],{timeout:45000,stdio:"pipe",env:{...process.env,HOME:home}});
}

function renderWithRuntimeBrowser(htmlPath:string,pdfPath:string,home:string){
  const helper=path.join(process.cwd(),"scripts","render_diagnostic_pdf_runtime.mjs");
  if(!fs.existsSync(helper))throw new Error("Bundled PDF renderer helper unavailable");
  execFileSync(process.execPath,[helper,htmlPath,pdfPath],{
    timeout:60000,
    stdio:"pipe",
    env:{...process.env,HOME:home},
  });
}

export function renderDiagnosticReportPdfFromHtml(html:string){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"math-diagnostic-pdf-"));
  const htmlPath=path.join(dir,"report.html");
  const pdfPath=path.join(dir,"report.pdf");
  const profilePath=path.join(dir,"chrome-profile");
  try{
    fs.writeFileSync(htmlPath,html,"utf8");
    const chrome=systemChrome();
    let systemError:unknown=null;
    if(chrome){
      try{
        renderWithChrome(htmlPath,pdfPath,profilePath,chrome,dir);
      }catch(error){
        systemError=error;
      }
    }
    if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000){
      try{
        renderWithRuntimeBrowser(htmlPath,pdfPath,dir);
      }catch(error){
        if(systemError instanceof Error){
          throw new Error(`PDF rendering failed with system browser (${systemError.message}) and runtime browser (${error instanceof Error?error.message:String(error)})`);
        }
        throw error;
      }
    }
    if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000)throw new Error("PDF output missing");
    return fs.readFileSync(pdfPath);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
