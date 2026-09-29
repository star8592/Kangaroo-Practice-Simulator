import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync=promisify(execFile);

export async function renderArithmeticPdfFromUrl(url:string,cookie:string,expectedPages:number){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"arithmetic-pdf-"));
  const config=path.join(dir,"config.json");
  const output=path.join(dir,"arithmetic.pdf");
  try{
    fs.writeFileSync(config,JSON.stringify({url,cookie,expectedPages}),"utf8");
    await execFileAsync(process.execPath,[path.join(process.cwd(),"scripts","render_arithmetic_pdf_runtime.mjs"),config,output],{
      timeout:90000,
      maxBuffer:2*1024*1024,
      env:{...process.env,HOME:dir},
    });
    if(!fs.existsSync(output)||fs.statSync(output).size<1000)throw new Error("Arithmetic PDF output missing");
    return fs.readFileSync(output);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
