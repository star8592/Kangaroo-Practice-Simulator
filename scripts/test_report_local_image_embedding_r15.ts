import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import {embedLocalReportImages} from "../src/lib/diagnostic-report-embed-assets";

let passed=0;
const ok=(name:string,condition:boolean)=>{assert.ok(condition,name);passed++;console.log("PASS",name)};
function crc32(buf:Buffer){
 let c=0xffffffff;
 for(const b of buf){
  c^=b;
  for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);
 }
 return (c^0xffffffff)>>>0;
}
function pngChunk(type:string,body:Buffer){
 const typeBytes=Buffer.from(type,"ascii");
 const header=Buffer.alloc(4);header.writeUInt32BE(body.length,0);
 const c=Buffer.alloc(4);c.writeUInt32BE(crc32(Buffer.concat([typeBytes,body])),0);
 return Buffer.concat([header,typeBytes,body,c]);
}
function syntheticPng(){
 const w=400,h=240,scan=Buffer.alloc((w*3+1)*h);
 for(let y=0;y<h;y++){
  const line=y*(w*3+1);
  for(let x=0;x<w;x++){
   const px=line+1+x*3;
   const black=Math.abs(x-(2*y))<3 || Math.abs(x-(w-2*y))<3 || y===200;
   scan[px]=black?24:255;
   scan[px+1]=black?42:255;
   scan[px+2]=black?70:255;
  }
 }
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  pngChunk("IHDR",ihdr),pngChunk("IDAT",zlib.deflateSync(scan)),pngChunk("IEND",Buffer.alloc(0))]);
}
const base=fs.mkdtempSync(path.join(os.tmpdir(),"amc8-r15-image-inlining-"));
const root=path.join(base,"local-assets");
try{
 fs.mkdirSync(path.join(root,"qa"),{recursive:true});
 fs.writeFileSync(path.join(root,"qa","diagram.png"),syntheticPng());
 const source='<div>简体中文</div><img src="/local-assets/qa/diagram.png" srcset="/local-assets/qa/diagram.png 1x">';
 const result=embedLocalReportImages(source,root);
 ok("local static image inlined into authenticated report",result.includes('src="data:image/png;base64,'));
 ok("untrusted srcset removed",!result.includes("srcset="));
 ok("no private on-disk absolute filename leaked",!result.includes(base));
 ok("Chinese report content preserved",result.includes("简体中文"));
 const twice=embedLocalReportImages(source+source,root);
 ok("multiple source pictures are handled",twice.split("data:image/png;base64,").length===3);
 const remote='<img src="https://external.example/tracker.png">';
 ok("other remote tags not rewritten",embedLocalReportImages(remote,root)===remote);
 const lazy='<img data-src="/local-assets/qa/diagram.png" src="/other.png">';
 ok("lazy data-src is not mistaken for real image src",embedLocalReportImages(lazy,root)===lazy);

 const good=embedLocalReportImages('<img src="/local-assets/qa/diagram.png">',root);
 ok("PNG data URL has nonempty exact source bytes",good.includes(syntheticPng().toString("base64")));
 for(const [name,url] of [
  ["dotdot","/local-assets/../outside.png"],
  ["encoded dotdot","/local-assets/%2e%2e/outside.png"],
  ["query url","/local-assets/qa/diagram.png?x=1"],
  ["unapproved svg","/local-assets/qa/diagram.svg"],
  ["missing source","/local-assets/qa/missing.png"],
 ] as const){
  assert.throws(()=>embedLocalReportImages('<img src="'+url+'">',root));
  passed++;console.log("PASS",name+" rejected");
 }
 const outside=path.join(base,"outside.png");fs.copyFileSync(path.join(root,"qa","diagram.png"),outside);
 fs.symlinkSync(outside,path.join(root,"qa","link.png"));
 assert.throws(()=>embedLocalReportImages('<img src="/local-assets/qa/link.png">',root));
 passed++;console.log("PASS out-of-root symlink rejected");
 const oversized=path.join(root,"qa","oversized.png");
 fs.writeFileSync(oversized,Buffer.alloc(1));
 fs.truncateSync(oversized,13*1024*1024);
 assert.throws(()=>embedLocalReportImages('<img src="/local-assets/qa/oversized.png">',root));
 passed++;console.log("PASS oversized image rejected");
 console.log("AMC8_REPORT_ASSET_INLINE="+passed+"/"+passed+" PASS (synthetic only)");
}finally{fs.rmSync(base,{recursive:true,force:true})}
