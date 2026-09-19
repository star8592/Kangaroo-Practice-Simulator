import { gradeExam } from "../src/lib/grading";
import { applyMaaFormat } from "../src/lib/maa-amc-format";
import type { ExamProfile,Question } from "../src/lib/types";
function base(id:string):ExamProfile{return {id,name:id,grades:"",durationSeconds:0,questionCount:0,initialScore:0,maxScore:0,wrongPenaltyMode:"fixed",wrongPenaltyValue:0,country:"MAA AMC",competitionId:"maa-amc"}}
function qs(n:number,points:number,mode:"choice"|"integer"="choice"):Question[]{return Array.from({length:n},(_,i)=>({id:`q${i+1}`,year:2026,level:"",grades:"",language:"en",questionNo:i+1,points,answerMode:mode,concept:"test",stem:"",choices:mode==="choice"?[{key:"A",label:"A"},{key:"B",label:"B"}]:[],answer:mode==="choice"?"A":"001",solution:"",sourceFile:"test",examReady:true}))}
const p8=applyMaaFormat(base("amc8"),"maa-amc8"), q8=qs(25,1); if(gradeExam(q8,Object.fromEntries(q8.slice(0,20).map(q=>[q.id,"A"])),p8).score!==20)throw Error("AMC8 scoring");
const p10=applyMaaFormat(base("amc10"),"maa-amc10"), q10=qs(25,6); const blank=gradeExam(q10,{},p10); if(blank.score!==37.5)throw Error(`AMC10 blank ${blank.score}`); const one=gradeExam(q10,{q1:"A",q2:"B"},p10); if(one.score!==40.5)throw Error(`AMC10 mixed ${one.score}`); if(gradeExam(q10,Object.fromEntries(q10.map(q=>[q.id,"A"])),p10).score!==150)throw Error("AMC10 full");
const pa=applyMaaFormat(base("aime"),"maa-aime-classic"), qa=qs(15,1,"integer"); if(gradeExam(qa,{q1:"1",q2:"001"},pa).score!==2)throw Error("AIME scoring");
console.log("MAA_SCORING=PASS AMC8=20/25 AMC10_blank=37.5 AMC10_mixed=40.5 AMC10_full=150 AIME_numeric_equivalence=2/15");
