import fs from "node:fs";
import path from "node:path";

async function main(){
const userId=`aime-test-user-${process.pid}`,examId=`aime-test-${process.pid}`;
const sessionFile=path.join(process.cwd(),"private","users","exam-sessions.json");
const cleanup=()=>{
  if(!fs.existsSync(sessionFile))return;
  try{const rows=JSON.parse(fs.readFileSync(sessionFile,"utf8"));fs.writeFileSync(sessionFile,JSON.stringify(rows.filter((x:{userId?:string})=>x.userId!==userId),null,2))}catch{}
};
cleanup();
const { MAA_FORMATS }=await import("../src/lib/maa-amc-format");
const {
  startExamSession,lockExamSection,startExamSection,
  lockedExamAnswers,allExamSectionsLocked,activeSectionElapsedSeconds,saveExamSectionDraft
}=await import("../src/lib/exam-session");

const sections=MAA_FORMATS["maa-aime-2027"].timingSections;
if(!sections||sections.length!==2)throw new Error("AIME 2027 must have two sections");
if(sections[0].questionStart!==1||sections[0].questionEnd!==8||sections[0].durationSeconds!==5400)throw new Error("Part 1 spec");
if(sections[1].questionStart!==9||sections[1].questionEnd!==15||sections[1].durationSeconds!==5400)throw new Error("Part 2 spec");

const t=Date.now();
const started=startExamSession(userId,examId,10800,sections,t).session;
if(started.sectionIndex!==0||started.sectionStartedAt!==t)throw new Error("initial section state");

const ids1=Array.from({length:8},(_,i)=>`q${i+1}`);
saveExamSectionDraft({id:started.id,userId,examId,sectionIndex:0,answers:{q1:"001",q8:"008",q9:"SHOULD_NOT_SAVE"},questionIds:ids1,durationSeconds:5400,now:t+5399_000});
const after1=lockExamSection({
  id:started.id,userId,examId,sectionIndex:0,
  answers:{q1:"999",q8:"999",q9:"SHOULD_NOT_LOCK"},questionIds:ids1,durationSeconds:5400,now:t+5401_000
});
if(after1.sectionIndex!==1||after1.sectionStartedAt!==undefined)throw new Error("intermission state");
let locked=lockedExamAnswers(after1);
if(locked.q1!=="001"||locked.q8!=="008"||locked.q9!==undefined)throw new Error("Part 1 answer boundary");

const part2Start=t+5700_000; // five-minute training break; not counted as active exam time
const running2=startExamSection({id:started.id,userId,examId,sectionIndex:1,now:part2Start});
if(running2.sectionStartedAt!==part2Start)throw new Error("Part 2 start");

const ids2=Array.from({length:7},(_,i)=>`q${i+9}`);
saveExamSectionDraft({id:started.id,userId,examId,sectionIndex:1,answers:{q9:"009",q15:"015"},questionIds:ids2,durationSeconds:5400,now:part2Start+5399_000});
const after2=lockExamSection({
  id:started.id,userId,examId,sectionIndex:1,
  answers:{q8:"SHOULD_NOT_CHANGE",q9:"999",q15:"999"},questionIds:ids2,durationSeconds:5400,now:part2Start+5401_000
});
locked=lockedExamAnswers(after2);
if(locked.q8!=="008"||locked.q9!=="009"||locked.q15!=="015")throw new Error("locked snapshot integrity");
if(!allExamSectionsLocked(after2,2))throw new Error("all sections should be locked");
if(activeSectionElapsedSeconds(after2,sections)!==10800)throw new Error("break must not count toward active time");

cleanup();
console.log("AIME_SECTIONS=PASS part1=Q1-8/90m part2=Q9-15/90m server_deadline_lock=true break_excluded=true");
}
main().catch(e=>{console.error(e);process.exit(1)});
