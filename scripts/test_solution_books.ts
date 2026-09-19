import fs from "node:fs";
import path from "node:path";
import { hasExactQuestionMapping, solutionBookForExam, solutionBookPageUrl } from "../src/lib/solution-books";

function assertAssets(examId:string){
  const b=solutionBookForExam(examId);
  if(!b) throw new Error("missing solution book " + examId);
  for(let p=1;p<=b.totalPages;p++){
    const rel=solutionBookPageUrl(b,p).replace(/^\//,"");
    const f=path.join(process.cwd(),"public",rel);
    if(!fs.existsSync(f) || fs.statSync(f).size<10000) throw new Error("missing/too-small solution page " + f);
  }
  return b;
}

const b=assertAssets("maa-amc8-2024-user-owned");
if(b.totalPages!==22 || !hasExactQuestionMapping(b)) throw new Error("2024 exact mapping missing");
const mapped=Object.keys(b.questionPages||{}).map(Number).sort((a,b)=>a-b);
if(mapped.length!==25 || mapped.some((q,i)=>q!==i+1)) throw new Error("2024 question mapping incomplete");
if(b.questionPages?.[1]?.join(",")!=="1" || b.questionPages?.[8]?.join(",")!=="6" || b.questionPages?.[25]?.join(",")!=="21,22") throw new Error("2024 page regression");

const years=[...Array.from({length:21},(_,i)=>2000+i),2022];
for(const y of years){
  const h=assertAssets("maa-amc8-" + y + "-user-owned");
  if(hasExactQuestionMapping(h)) throw new Error(String(y) + ": unverified exact mapping exposed");
}
if(solutionBookForExam("maa-amc8-2021-user-owned")) throw new Error("nonexistent 2021 AMC8 exposed");
if(solutionBookForExam("maa-amc8-2023-sample")) throw new Error("2023 sample incorrectly bound to historical book");
console.log("SOLUTION_BOOKS=PASS 2024_exact=25 history_years=22 history_mode=year-book 2021_absent=true 2023_sample_unbound=true");
