import fs from "node:fs";
import path from "node:path";
import { loadVerifiedSolution } from "../src/lib/solution-store";

const exam=JSON.parse(fs.readFileSync(path.join(process.cwd(),"private/exams/maa-amc8-2024-user-owned.json"),"utf8"));
const answers=new Map<number,string>(exam.questions.map((q:any)=>[q.questionNo,q.answer]));
const expected=Array.from({length:25},(_,i)=>i+1);
for(const q of expected){
  const id="maa-amc8-2024-q"+String(q).padStart(2,"0");
  const file=path.join(process.cwd(),"private/solutions",id+".json");
  if(!fs.existsSync(file)) throw new Error("missing storyboard "+id);
  const raw=JSON.parse(fs.readFileSync(file,"utf8"));
  const official=answers.get(q);
  if(raw.verification?.officialAnswer!==official || raw.verification?.derivedAnswer!==official) {
    throw new Error(id+": answer mismatch");
  }
  if(!Array.isArray(raw.verification?.evidencePages)||!raw.verification.evidencePages.length) throw new Error(id+": evidence pages missing");
  const loaded=loadVerifiedSolution(id);
  if(!loaded||loaded.quality!=="verified"||loaded.scenes.length<3) throw new Error(id+": loader rejected");
  for(const s of loaded.scenes){
    if(!s.narration||s.narration.length>220) throw new Error(id+": narration invalid");
  }
}
const pending=25-expected.length;
console.log("VERIFIED_STORYBOARDS=PASS verified="+expected.length+" pending="+pending+" answer_crosscheck=true evidence=true loader=true");
