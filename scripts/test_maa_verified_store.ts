import fs from "node:fs";
import path from "node:path";
import {loadVerifiedSolution} from "../src/lib/solution-store";

const root=process.cwd();
const exams=path.join(root,"private","exams");
const sols=path.join(root,"private","solutions");
const answerById=new Map<string,string>();
for(const name of fs.readdirSync(exams).filter(x=>/^maa-.*\.json$/.test(x))){
  try{
    const b=JSON.parse(fs.readFileSync(path.join(exams,name),"utf8"));
    for(const q of b.questions||[]) if(q?.id&&q?.answer) answerById.set(q.id,q.answer);
  }catch{}
}
let checked=0, exactPages=0, external=0;
for(const name of fs.readdirSync(sols).filter(x=>/^maa-.*-q\d+\.json$/.test(x)).sort()){
  const file=path.join(sols,name), raw=JSON.parse(fs.readFileSync(file,"utf8"));
  const id=raw.questionId||name.replace(/\.json$/,"");
  const official=answerById.get(id);
  if(!official) throw new Error(id+": no local official answer");
  if(raw.verification?.officialAnswer!==official||raw.verification?.derivedAnswer!==official) throw new Error(id+": answer mismatch");
  const pages=Array.isArray(raw.verification?.evidencePages)&&raw.verification.evidencePages.length>0;
  const urls=Array.isArray(raw.verification?.evidenceUrls)&&raw.verification.evidenceUrls.some((u:any)=>typeof u==="string"&&/^https?:\/\//.test(u));
  if(!pages&&!urls) throw new Error(id+": missing exact-page or independent-url evidence");
  if(typeof raw.verification?.evidenceBook!=="string"||!raw.verification.evidenceBook) throw new Error(id+": evidenceBook missing");
  if(!loadVerifiedSolution(id)) throw new Error(id+": verified loader rejected");
  if(pages) exactPages++; if(urls) external++; checked++;
}
console.log("MAA_VERIFIED_STORE=PASS checked="+checked+" exact_page="+exactPages+" external_url="+external);
