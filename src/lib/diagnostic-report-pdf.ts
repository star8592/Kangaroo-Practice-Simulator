import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function chromeBinaries(){
  const configured=process.env.CHROME_BIN?.trim();
  return configured?[configured]:[
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
}

export function renderDiagnosticReportPdfFromHtml(html:string){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"math-diagnostic-pdf-"));
  const htmlPath=path.join(dir,"report.html");
  const pdfPath=path.join(dir,"report.pdf");
  const profilePath=path.join(dir,"chrome-profile");
  try{
    fs.writeFileSync(htmlPath,html,"utf8");
    const args=[
      "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--allow-file-access-from-files",
      "--no-pdf-header-footer",`--user-data-dir=${profilePath}`,`--print-to-pdf=${pdfPath}`,`file://${htmlPath}`,
    ];
    let launched=false,lastError:unknown=null;
    for(const chrome of chromeBinaries()){
      if(!fs.existsSync(chrome))continue;
      try{
        execFileSync(/* turbopackIgnore: true */ chrome,args,{timeout:45000,stdio:"pipe",env:{...process.env,HOME:dir}});
        launched=true;break;
      }catch(error){lastError=error}
    }
    if(!launched)throw lastError instanceof Error?lastError:new Error("Chrome/Chromium unavailable");
    if(!fs.existsSync(pdfPath)||fs.statSync(pdfPath).size<1000)throw new Error("PDF output missing");
    return fs.readFileSync(pdfPath);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
