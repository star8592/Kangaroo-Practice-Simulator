import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {loadTrainingExamBundle} from "../src/lib/training-question-bank";
import {marketplaceExamAssetsReady} from "../src/lib/marketplace-exam-assets";
const b=loadTrainingExamBundle("maa-amc8-2024-user-owned");
let checks=0;
function ok(label:string,pass:boolean){assert.ok(pass,label);checks++;console.log("PASS "+label)}
ok("complete 25 question asset set",marketplaceExamAssetsReady(b.questions));
const q=b.questions[0];
const url=q.studentAssetUrl||q.studentAssetUrlZh||q.assetUrl||q.assetUrlZh;
assert.ok(url);
const filename=path.join(process.cwd(),"public",url!.replace(/^\//,""));
const backup=fs.readFileSync(filename);
try{
 fs.rmSync(filename);
 ok("missing image rejects commercial exam",!marketplaceExamAssetsReady(b.questions));
 fs.writeFileSync(filename,Buffer.alloc(128));
 ok("invalid PNG signature rejects commercial exam",!marketplaceExamAssetsReady(b.questions));
 fs.rmSync(filename);
 fs.symlinkSync("/dev/null",filename);
 ok("symbolic link asset rejects commercial exam",!marketplaceExamAssetsReady(b.questions));
}finally{
 fs.rmSync(filename,{force:true});
 fs.writeFileSync(filename,backup);
}
ok("verified asset restores original eligibility",marketplaceExamAssetsReady(b.questions));
const malicious=b.questions.map(x=>({...x,assetUrl:"/local-assets/../private/accounts.png"}));
ok("path traversal refuses exam asset",!marketplaceExamAssetsReady(malicious));
console.log("MARKETPLACE_ASSET_FAULTS="+checks+"/"+checks+" PASS");
