import fs from "node:fs";
import path from "node:path";
import type {Question} from "./types";

export function marketplaceExamAssetsReady(questions:readonly Question[]):boolean{
  if(!questions.length)return false;
  const publicDir=path.resolve(process.cwd(),"public");
  for(const q of questions){
    const urls=[q.studentAssetUrl,q.studentAssetUrlZh,q.studentAssetUrlEn,
      q.assetUrl,q.assetUrlZh,q.assetUrlEn].filter((x):x is string=>Boolean(x));
    for(const url of new Set(urls)){
      if(!/^\/local-assets\/[A-Za-z0-9_./-]+\.png$/.test(url)
        ||url.includes("..")||url.includes("//"))return false;
      const filename=path.resolve(publicDir,"."+url);
      if(!filename.startsWith(publicDir+path.sep))return false;
      try{
        const stat=fs.lstatSync(filename);
        if(!stat.isFile()||stat.isSymbolicLink()||stat.size<80)return false;
        const prefix=Buffer.alloc(8);
        const fd=fs.openSync(filename,"r");
        try{fs.readSync(fd,prefix,0,8,0)}finally{fs.closeSync(fd)}
        if(!prefix.equals(Buffer.from([137,80,78,71,13,10,26,10])))return false;
      }catch{return false}
    }
  }
  return true;
}
