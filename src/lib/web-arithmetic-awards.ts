import { readSignedJsonToken, signJsonToken } from "./auth-crypto";
import { buildTrainingPlan, finalizeAttempt, type ArithmeticSession } from "./arithmetic-analytics";
import { GRADE_PROFILES, type ArithmeticGrade } from "./arithmetic";
import { generateArithmeticSet, generateDiagnosticSet, type ArithmeticItem } from "./arithmetic-generator";
import { normalizeArithmeticInput } from "./arithmetic-input";
import { readOrCreateSecret, userDataPath } from "./user-data-store";

type Mode = ArithmeticSession["mode"];
type Ticket = { uid:string; grade:ArithmeticGrade; mode:Mode; seed:number; startedAt:number; exp:number; items:ArithmeticItem[] };
const secret=()=>readOrCreateSecret(userDataPath("web-arithmetic-award-secret.txt"));
const modes:Mode[]=["diagnostic","adaptive","speed","guided"];
const validGrade=(n:number):n is ArithmeticGrade=>Number.isInteger(n)&&n>=1&&n<=12&&Boolean(GRADE_PROFILES[n as ArithmeticGrade]);
const comparable=(item:ArithmeticItem)=>JSON.stringify([item.id,item.grade,item.skillId,item.prompt,item.answer,item.answerKind??"number",Boolean(item.requireSimplified)]);

export function issueWebArithmeticTicket(uid:string,grade:number,mode:string,seed:number,history:ArithmeticSession[]){
  if(!uid || !validGrade(grade) || !modes.includes(mode as Mode) || !Number.isSafeInteger(seed) || seed<=0)throw new Error("无效的训练参数");
  const trainingMode=mode as Mode;
  const plan=trainingMode==="adaptive"?buildTrainingPlan(grade,history):null;
  const focus=plan?.focusSkills||[];
  const count=trainingMode==="diagnostic"?20:trainingMode==="speed"?60:focus.length===0?12:focus.length===1?16:20;
  let items=trainingMode==="diagnostic"?generateDiagnosticSet(grade,count,seed):generateArithmeticSet(grade,count,seed,focus,false,plan?.focusNodes||[]);
  if(plan)items=items.map(item=>({...item,expectedMs:plan.metrics.find(m=>m.skillId===item.skillId)?.personalTargetMs||item.expectedMs}));
  const startedAt=Date.now();
  const ticket:Ticket={uid,grade,mode:trainingMode,seed,startedAt,exp:Math.floor(startedAt/1000)+4*3600,items};
  return {token:signJsonToken(ticket,secret()),items,history};
}

export function verifyWebArithmeticSubmission(uid:string,token:string,untrusted:ArithmeticSession):ArithmeticSession{
  const t=readSignedJsonToken<Ticket>(token,secret());
  if(!t||t.uid!==uid||t.exp<Math.floor(Date.now()/1000)||!validGrade(t.grade) || !modes.includes(t.mode) || !Array.isArray(t.items))throw new Error("训练凭证无效或已过期，请重新开始");
  if(!untrusted||untrusted.id!==("arith-"+uid+"-g"+t.grade+"-"+t.seed+"-"+t.mode) || untrusted.grade!==t.grade || untrusted.mode!==t.mode || !Array.isArray(untrusted.attempts))throw new Error("训练会话与凭证不匹配");
  if(untrusted.attempts.length<t.items.length || untrusted.attempts.length>t.items.length+6 || untrusted.attempts.length>66)throw new Error("题量不完整或超出本轮限制");
  const expected=new Map(t.items.map(q=>[q.id,q]));
  const seen=new Set<string>();
  const attempts=untrusted.attempts.map(raw=>{
    if(!raw||!raw.item||typeof raw.answer!=="string"||raw.answer.length>100)throw new Error("答题数据无效");
    const id=raw.item.id;
    if(typeof id!=="string"||seen.has(id))throw new Error("存在重复题号");
    seen.add(id);
    let item=expected.get(id);
    if(!item&&t.mode==="adaptive"){
      const reportedSeed=Number(raw.item.meta?.seed),offset=reportedSeed-t.seed-1000;
      if(Number.isSafeInteger(reportedSeed)&&Number.isInteger(offset)&&offset>=0&&offset<t.items.length+6
        &&raw.item.grade===t.grade && typeof raw.item.skillId==="string"
        &&GRADE_PROFILES[t.grade].skills.some(skill=>skill.id===raw.item.skillId)){
        item=generateArithmeticSet(t.grade,1,reportedSeed,[raw.item.skillId])[0];
      }
    }
    if(!item||comparable(item)!==comparable(raw.item))throw new Error("题目与服务端下发内容不符");
    const ms=Number(raw.responseMs),first=Number(raw.firstInputMs);
    if(!Number.isFinite(ms)||ms<1||ms>4*3600*1000||!Number.isFinite(first)||first<0||first>ms)throw new Error("答题时长数据无效");
    const edits=Number(raw.edits),backspaces=Number(raw.backspaces);
    if(!Number.isInteger(edits)||edits<0||edits>1000||!Number.isInteger(backspaces)||backspaces<0||backspaces>1000)throw new Error("输入行为数据无效");
    const answer=normalizeArithmeticInput(raw.answer);
    return finalizeAttempt(item,answer,{presentedAt:0,firstInputAt:first,submittedAt:ms,edits,backspaces});
  });
  if(t.items.some(item=>!seen.has(item.id)))throw new Error("未完成下发的题目");
  return {id:untrusted.id,studentId:uid,grade:t.grade,mode:t.mode,startedAt:t.startedAt,finishedAt:Date.now(),attempts,rewardVerified:true,expectedQuestionCount:t.items.length};
}
