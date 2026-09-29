import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PDF_LIGHT_STYLE = `<style id="diagnostic-pdf-light-theme">html,body{background:#fff!important;color:#17211c!important;color-scheme:light!important}body{margin:0!important}.diagnostic-report{background:#fff!important}.diagnostic-report .report-page{background:#fff!important;color:#17211c!important}</style>`;

function forceLightPdfHtml(html:string){
  if(html.includes("</head>"))return html.replace("</head>",`${PDF_LIGHT_STYLE}</head>`);
  return `${PDF_LIGHT_STYLE}${html}`;
}

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
    "--disable-features=WebContentsForceDark,AutoDarkMode",
    "--force-color-profile=srgb",
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

function validPdf(pdfPath:string){
  return fs.existsSync(pdfPath)&&fs.statSync(pdfPath).size>=1000;
}

export function renderDiagnosticReportPdfFromHtml(html:string){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"math-diagnostic-pdf-"));
  const htmlPath=path.join(dir,"report.html");
  const pdfPath=path.join(dir,"report.pdf");
  const profilePath=path.join(dir,"chrome-profile");
  try{
    fs.writeFileSync(htmlPath,forceLightPdfHtml(html),"utf8");
    let runtimeError:unknown=null;
    try{
      renderWithRuntimeBrowser(htmlPath,pdfPath,dir);
    }catch(error){
      runtimeError=error;
    }

    let systemError:unknown=null;
    if(!validPdf(pdfPath)){
      const chrome=systemChrome();
      if(chrome){
        try{
          renderWithChrome(htmlPath,pdfPath,profilePath,chrome,dir);
        }catch(error){
          systemError=error;
        }
      }
    }

    if(!validPdf(pdfPath)){
      const runtimeMessage=runtimeError instanceof Error?runtimeError.message:String(runtimeError||"unavailable");
      const systemMessage=systemError instanceof Error?systemError.message:String(systemError||"unavailable");
      throw new Error(`PDF rendering failed with runtime browser (${runtimeMessage}) and system browser (${systemMessage})`);
    }
    return fs.readFileSync(pdfPath);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
