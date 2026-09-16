import { GRADE_PROFILES, type ArithmeticGrade, type MentalStrategy } from "./arithmetic";
import type { ArithmeticItem } from "./arithmetic-generator";

export type ErrorReason="correct"|"slow_recall"|"impulsive"|"hesitation"|"near_miss"|"operation_confusion"|"place_value"|"fact_gap"|"strategy_missed"|"unknown";
export type ArithmeticAttempt={item:ArithmeticItem;answer:string;numericAnswer:number|null;correct:boolean;presentedAt:number;firstInputAt:number|null;submittedAt:number;firstInputMs:number;responseMs:number;edits:number;backspaces:number;reason:ErrorReason};
export type ArithmeticSession={id:string;grade:ArithmeticGrade;mode:"diagnostic"|"adaptive"|"speed";startedAt:number;finishedAt:number;attempts:ArithmeticAttempt[]};
export type SkillMetric={skillId:string;attempts:number;correct:number;accuracy:number;medianMs:number;speedRatio:number;editRate:number;priority:number};
export type TrainingPlan={grade:ArithmeticGrade;focusSkills:string[];focusStrategies:MentalStrategy[];reasons:{code:ErrorReason;count:number}[];summaryZh:string[];summaryEn:string[];metrics:SkillMetric[]};

function median(xs:number[]){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function parseNumbers(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);}
export function classifyAttempt(item:ArithmeticItem,raw:string,responseMs:number,firstInputMs:number,edits:number,backspaces:number):ErrorReason{
 const x=Number(raw); const correct=raw.trim()!==""&&Number.isFinite(x)&&Math.abs(x-item.answer)<1e-9;
 if(correct){if(responseMs>item.expectedMs*1.55)return item.strategy==="fact_recall"?"slow_recall":"strategy_missed";if(firstInputMs>item.expectedMs*.9||edits>=4)return"hesitation";return"correct";}
 if(responseMs<item.expectedMs*.42&&firstInputMs<item.expectedMs*.3)return"impulsive";
 if(firstInputMs>item.expectedMs*.95||edits>=4||backspaces>=3)return"hesitation";
 if(Number.isFinite(x)&&Math.abs(x-item.answer)===1)return"near_miss";
 const ns=parseNumbers(item.prompt); if(Number.isFinite(x)&&ns.length>=2){const [a,b]=ns;if(Math.abs(x-(a+b))<1e-9||Math.abs(x-(a-b))<1e-9||Math.abs(x-a*b)<1e-9)return"operation_confusion";if(Math.abs(x-item.answer)%10===0||Math.abs(x-item.answer)%100===0)return"place_value";}
 if(item.strategy==="fact_recall")return"fact_gap";
 return"unknown";
}
export function finalizeAttempt(item:ArithmeticItem,raw:string,t:{presentedAt:number;firstInputAt:number|null;submittedAt:number;edits:number;backspaces:number}):ArithmeticAttempt{
 const numeric=raw.trim()===""?null:Number(raw);const correct=numeric!==null&&Number.isFinite(numeric)&&Math.abs(numeric-item.answer)<1e-9;const responseMs=Math.max(1,t.submittedAt-t.presentedAt);const firstInputMs=t.firstInputAt?Math.max(0,t.firstInputAt-t.presentedAt):responseMs;
 return{item,answer:raw,numericAnswer:numeric!==null&&Number.isFinite(numeric)?numeric:null,correct,presentedAt:t.presentedAt,firstInputAt:t.firstInputAt,submittedAt:t.submittedAt,firstInputMs,responseMs,edits:t.edits,backspaces:t.backspaces,reason:classifyAttempt(item,raw,responseMs,firstInputMs,t.edits,t.backspaces)};
}
export function buildTrainingPlan(grade:ArithmeticGrade,sessions:ArithmeticSession[]):TrainingPlan{
 const profile=GRADE_PROFILES[grade];const attempts=sessions.filter(s=>s.grade===grade).flatMap(s=>s.attempts).slice(-240);const bySkill=new Map<string,ArithmeticAttempt[]>();
 for(const a of attempts){const x=bySkill.get(a.item.skillId)||[];x.push(a);bySkill.set(a.item.skillId,x)}
 const metrics:SkillMetric[]=profile.skills.map(s=>{const a=bySkill.get(s.id)||[];const correct=a.filter(x=>x.correct).length;const accuracy=a.length?correct/a.length:0;const med=median(a.map(x=>x.responseMs));const speedRatio=a.length?med/s.targetMs:2;const editRate=a.length?a.filter(x=>x.edits>=3||x.backspaces>=2).length/a.length:0;const priority=(1-accuracy)*2.8+Math.max(0,speedRatio-1)*.9+editRate*.8+(a.length<5?.5:0);return{skillId:s.id,attempts:a.length,correct,accuracy,medianMs:med,speedRatio,editRate,priority}}).sort((a,b)=>b.priority-a.priority);
 const reasonCounts=new Map<ErrorReason,number>();for(const a of attempts){if(a.reason!=="correct")reasonCounts.set(a.reason,(reasonCounts.get(a.reason)||0)+1)}
 const reasons=[...reasonCounts.entries()].map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count);const focusSkills=metrics.slice(0,Math.min(3,metrics.length)).map(x=>x.skillId);
 const focusStrategies=[...new Set(attempts.filter(a=>focusSkills.includes(a.item.skillId)&&(["strategy_missed","slow_recall","fact_gap"] as ErrorReason[]).includes(a.reason)).map(a=>a.item.strategy))].slice(0,4);
 const top=reasons[0]?.code;const zh:string[]=[];const en:string[]=[];
 if(!attempts.length){zh.push("先完成一次20题诊断，系统会建立你的个人速度与准确率基线。");en.push("Complete a 20-question diagnostic to establish your personal speed and accuracy baseline.")}
 else {const overall=attempts.filter(a=>a.correct).length/attempts.length;zh.push(`最近 ${attempts.length} 题正确率 ${(overall*100).toFixed(0)}%，优先训练：${focusSkills.map(id=>profile.skills.find(s=>s.id===id)?.labelZh||id).join("、")}。`);en.push(`Recent accuracy ${(overall*100).toFixed(0)}%. Priority skills: ${focusSkills.map(id=>profile.skills.find(s=>s.id===id)?.labelEn||id).join(", ")}.`);if(top==="impulsive"){zh.push("主要习惯问题是出手过快：下一轮会降低题量节奏，要求先判断运算结构再输入。");en.push("Main habit: impulsive answering. The next set will emphasize structure before response.")}if(top==="hesitation"){zh.push("主要问题是启动慢和反复修改：下一轮会增加同结构短组训练，减少决策负担。");en.push("Main issue: slow starts and repeated editing. The next set will use short same-structure runs.")}if(reasons.some(x=>x.code==="strategy_missed")){zh.push("有多道题答对但明显偏慢，说明巧算结构识别不足；下一轮会提高补整、分配律和友好数题的比例。");en.push("Several answers were correct but slow, suggesting missed mental shortcuts; shortcut patterns will be weighted more heavily.")}}
 return{grade,focusSkills,focusStrategies,reasons,summaryZh:zh,summaryEn:en,metrics};
}
