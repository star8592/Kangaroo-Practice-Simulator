import { GRADE_PROFILES, type ArithmeticGrade, type MentalStrategy } from "./arithmetic";
import type { ArithmeticItem } from "./arithmetic-generator";

export type ErrorReason="correct"|"slow_recall"|"impulsive"|"hesitation"|"near_miss"|"operation_confusion"|"place_value"|"fact_gap"|"strategy_missed"|"unknown";
export type ArithmeticAttempt={item:ArithmeticItem;answer:string;numericAnswer:number|null;correct:boolean;presentedAt:number;firstInputAt:number|null;submittedAt:number;firstInputMs:number;entryMs:number;responseMs:number;edits:number;backspaces:number;reason:ErrorReason;telemetryVersion?:2|3};
export type ArithmeticSession={id:string;studentId?:string;grade:ArithmeticGrade;mode:"diagnostic"|"adaptive"|"speed";startedAt:number;finishedAt:number;attempts:ArithmeticAttempt[]};
export type SkillStatus="unseen"|"insufficient"|"monitor"|"needs_accuracy"|"needs_fluency"|"mastered";
export type SkillMetric={skillId:string;attempts:number;correct:number;accuracy:number;medianMs:number;medianEntryMs:number;speedRatio:number;editRate:number;priority:number;status:SkillStatus;evidence:number;accuracyScore:number|null;fluencyScore:number|null;stabilityScore:number|null;strategyScore:number|null;baselineMs:number|null;personalTargetMs:number;improvementPct:number|null};
export type StrategyMetric={strategy:MentalStrategy;attempts:number;correct:number;accuracy:number;medianMs:number;evidence:number;status:SkillStatus};
export type TrainingPlan={grade:ArithmeticGrade;focusSkills:string[];accuracyFocusSkills:string[];fluencyFocusSkills:string[];monitorSkills:string[];focusStrategies:MentalStrategy[];reasons:{code:ErrorReason;count:number}[];summaryZh:string[];summaryEn:string[];metrics:SkillMetric[];strategyMetrics:StrategyMetric[]};

function median(xs:number[]){if(!xs.length)return 0;const a=[...xs].sort((x,y)=>x-y);const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mean(xs:number[]){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function stddev(xs:number[]){if(xs.length<2)return 0;const m=mean(xs);return Math.sqrt(xs.reduce((s,x)=>s+(x-m)*(x-m),0)/xs.length);}
function score100(x:number){return Math.max(0,Math.min(100,Math.round(x)));}
function parseNumbers(prompt:string){return (prompt.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);}
export function classifyAttempt(item:ArithmeticItem,raw:string,responseMs:number,firstInputMs:number,edits:number,backspaces:number):ErrorReason{
 const x=Number(raw); const correct=raw.trim()!==""&&Number.isFinite(x)&&Math.abs(x-item.answer)<1e-9;
 if(correct){if(edits>=2||backspaces>=2)return"hesitation";if(firstInputMs>item.expectedMs*1.35)return item.strategy==="fact_recall"?"slow_recall":"strategy_missed";return"correct";}
 if(responseMs<item.expectedMs*.42&&firstInputMs<item.expectedMs*.3)return"impulsive";
 if(firstInputMs>item.expectedMs*1.35||edits>=2||backspaces>=2)return"hesitation";
 if(Number.isFinite(x)&&Math.abs(x-item.answer)===1)return"near_miss";
 const ns=parseNumbers(item.prompt); if(Number.isFinite(x)&&ns.length>=2){const [a,b]=ns;if(Math.abs(x-(a+b))<1e-9||Math.abs(x-(a-b))<1e-9||Math.abs(x-a*b)<1e-9)return"operation_confusion";if(Math.abs(x-item.answer)%10===0||Math.abs(x-item.answer)%100===0)return"place_value";}
 if(item.strategy==="fact_recall")return"fact_gap";
 return"unknown";
}
export function finalizeAttempt(item:ArithmeticItem,raw:string,t:{presentedAt:number;firstInputAt:number|null;submittedAt:number;edits:number;backspaces:number}):ArithmeticAttempt{
 const numeric=raw.trim()===""?null:Number(raw);const correct=numeric!==null&&Number.isFinite(numeric)&&Math.abs(numeric-item.answer)<1e-9;const responseMs=Math.max(1,t.submittedAt-t.presentedAt);const firstInputMs=t.firstInputAt?Math.max(0,t.firstInputAt-t.presentedAt):responseMs;
 const entryMs=Math.max(0,responseMs-firstInputMs);return{item,answer:raw,numericAnswer:numeric!==null&&Number.isFinite(numeric)?numeric:null,correct,presentedAt:t.presentedAt,firstInputAt:t.firstInputAt,submittedAt:t.submittedAt,firstInputMs,entryMs,responseMs,edits:t.edits,backspaces:t.backspaces,reason:classifyAttempt(item,raw,responseMs,firstInputMs,t.edits,t.backspaces),telemetryVersion:3};
}
function normalizeLegacyAttempt(a:ArithmeticAttempt):ArithmeticAttempt{
 if(a.telemetryVersion===3)return a;
 // V1 counted every typed character as an edit. V2 fixed edit counting but used older, overly-sensitive timing thresholds.
 const edits=a.telemetryVersion===2?a.edits:(a.backspaces>0?Math.min(a.edits,a.backspaces):0);const entryMs=a.entryMs??Math.max(0,a.responseMs-a.firstInputMs);
 return {...a,entryMs,edits,reason:classifyAttempt(a.item,a.answer,a.responseMs,a.firstInputMs,edits,a.backspaces),telemetryVersion:3};
}
export function buildTrainingPlan(grade:ArithmeticGrade,sessions:ArithmeticSession[]):TrainingPlan{
 const profile=GRADE_PROFILES[grade];const gradeSessions=sessions.filter(s=>s.grade===grade);const attempts=gradeSessions.flatMap(s=>s.attempts).slice(-240).map(normalizeLegacyAttempt);const bySkill=new Map<string,ArithmeticAttempt[]>();
 for(const a of attempts){const x=bySkill.get(a.item.skillId)||[];x.push(a);bySkill.set(a.item.skillId,x)}
 const firstDiagnostic=[...gradeSessions].filter(s=>s.mode==="diagnostic").sort((a,b)=>a.startedAt-b.startedAt)[0];const baselineBySkill=new Map<string,ArithmeticAttempt[]>();
 for(const a0 of firstDiagnostic?.attempts||[]){const a=normalizeLegacyAttempt(a0);const x=baselineBySkill.get(a.item.skillId)||[];x.push(a);baselineBySkill.set(a.item.skillId,x)}
 const metrics:SkillMetric[]=profile.skills.map(s=>{const a=bySkill.get(s.id)||[];const correct=a.filter(x=>x.correct).length;const errors=a.length-correct;const accuracy=a.length?correct/a.length:0;const think=a.map(x=>x.firstInputMs);const med=median(think);const medEntry=median(a.map(x=>x.entryMs??Math.max(0,x.responseMs-x.firstInputMs)));const speedRatio=a.length?med/s.targetMs:0;const editRate=a.length?a.filter(x=>x.edits>=2||x.backspaces>=2).length/a.length:0;let status:SkillStatus="unseen";if(a.length){if(errors>=2||(a.length>=6&&accuracy<profile.targetAccuracy-.1))status="needs_accuracy";else if(errors===1)status="monitor";else if(a.length<4)status="insufficient";else if(speedRatio>1.1)status="needs_fluency";else status="mastered"}const priority=a.length?Math.max(0,profile.targetAccuracy-accuracy)*5+Math.max(0,speedRatio-1)*.8+editRate*.5:0;const evidence=score100(a.length/8*100);const enough=a.length>=4;const accuracyScore=a.length?score100(accuracy/profile.targetAccuracy*100):null;const fluencyScore=enough&&med>0?score100(s.targetMs/med*100):null;const m=mean(think);const cv=m>0?stddev(think)/m:0;const stabilityScore=enough?score100(100-cv*80-editRate*30):null;const efficient=a.filter(x=>x.correct&&x.firstInputMs<=s.targetMs*1.1&&!(["strategy_missed","slow_recall","hesitation"] as ErrorReason[]).includes(x.reason)).length;const strategyScore=enough?score100(efficient/a.length*100):null;const baseAttempts=baselineBySkill.get(s.id)||[];const baselineMs=baseAttempts.length?median(baseAttempts.map(x=>x.firstInputMs)):null;const personalTargetMs=med>0&&med>s.targetMs?Math.max(s.targetMs,Math.round(med*.92)):s.targetMs;const improvementPct=baselineMs&&med>0?Math.round((baselineMs-med)/baselineMs*100):null;return{skillId:s.id,attempts:a.length,correct,accuracy,medianMs:med,medianEntryMs:medEntry,speedRatio,editRate,priority,status,evidence,accuracyScore,fluencyScore,stabilityScore,strategyScore,baselineMs,personalTargetMs,improvementPct}}).sort((a,b)=>b.priority-a.priority);
 const reasonCounts=new Map<ErrorReason,number>();for(const a of attempts){if(a.reason!=="correct")reasonCounts.set(a.reason,(reasonCounts.get(a.reason)||0)+1)}
 const reasons=[...reasonCounts.entries()].map(([code,count])=>({code,count})).sort((a,b)=>b.count-a.count);
 const byStrategy=new Map<MentalStrategy,ArithmeticAttempt[]>();for(const a of attempts){const x=byStrategy.get(a.item.strategy)||[];x.push(a);byStrategy.set(a.item.strategy,x)}
 const strategyMetrics:StrategyMetric[]=[...byStrategy.entries()].map(([strategy,a])=>{const correct=a.filter(x=>x.correct).length;const accuracy=correct/a.length;const med=median(a.map(x=>x.firstInputMs));const ratios=a.map(x=>x.item.expectedMs>0?x.firstInputMs/x.item.expectedMs:1);const ratio=median(ratios);let status:SkillStatus="mastered";if(a.length<4)status="insufficient";else if(a.length-correct>=2)status="needs_accuracy";else if(a.length-correct===1)status="monitor";else if(ratio>1.1)status="needs_fluency";return{strategy,attempts:a.length,correct,accuracy,medianMs:med,evidence:score100(a.length/8*100),status}}).sort((a,b)=>{const rank=(x:SkillStatus)=>({needs_accuracy:5,needs_fluency:4,monitor:3,insufficient:2,mastered:1,unseen:0}[x]);return rank(b.status)-rank(a.status)||b.attempts-a.attempts});
 const accuracyFocusSkills=metrics.filter(x=>x.status==="needs_accuracy").slice(0,3).map(x=>x.skillId);
 const fluencyFocusSkills=metrics.filter(x=>x.status==="needs_fluency").sort((a,b)=>b.speedRatio-a.speedRatio).slice(0,2).map(x=>x.skillId);
 const monitorSkills=metrics.filter(x=>x.status==="monitor").slice(0,2).map(x=>x.skillId);
 const focusSkills=[...new Set([...accuracyFocusSkills,...fluencyFocusSkills])].slice(0,3);
 const focusStrategies=strategyMetrics.filter(x=>x.status==="needs_accuracy"||x.status==="needs_fluency").slice(0,4).map(x=>x.strategy);
 const zh:string[]=[];const en:string[]=[];
 const labelZh=(id:string)=>profile.skills.find(s=>s.id===id)?.labelZh||id;const labelEn=(id:string)=>profile.skills.find(s=>s.id===id)?.labelEn||id;
 if(!attempts.length){zh.push("先完成一次20题诊断，系统会建立你的个人速度与准确率基线。");en.push("Complete a 20-question diagnostic to establish your personal speed and accuracy baseline.")}
 else {
  const overall=attempts.filter(a=>a.correct).length/attempts.length;zh.push(`最近 ${attempts.length} 题正确 ${attempts.filter(a=>a.correct).length}/${attempts.length}（${(overall*100).toFixed(0)}%）。`);en.push(`Recent result: ${attempts.filter(a=>a.correct).length}/${attempts.length} correct (${(overall*100).toFixed(0)}%).`);
  if(accuracyFocusSkills.length){const detail=accuracyFocusSkills.map(id=>{const m=metrics.find(x=>x.skillId===id)!;return `${labelZh(id)} ${m.correct}/${m.attempts}`}).join("、");zh.push(`准确性需要补强：${detail}。这些项目才进入重点补错训练。`);const detailEn=accuracyFocusSkills.map(id=>{const m=metrics.find(x=>x.skillId===id)!;return `${labelEn(id)} ${m.correct}/${m.attempts}`}).join(", ");en.push(`Accuracy remediation: ${detailEn}. Only these skills enter focused error practice.`)}else{zh.push("目前没有足够证据把任何技能判定为“准确性弱项”。");en.push("There is not enough evidence to label any skill an accuracy weakness.")}
  if(monitorSkills.length){const detail=monitorSkills.map(id=>{const m=metrics.find(x=>x.skillId===id)!;return `${labelZh(id)}（${m.correct}/${m.attempts}）`}).join("、");zh.push(`单次异常，先复测不下结论：${detail}。下一轮不额外加权，只在正常题量中继续观察。`);en.push(`Single-event watchlist: ${monitorSkills.map(labelEn).join(", ")}. These will be lightly rechecked, not treated as established weaknesses.`)}
  const insufficient=metrics.filter(x=>x.status==="insufficient");if(insufficient.length){zh.push(`样本还不足：${insufficient.map(x=>`${labelZh(x.skillId)}仅${x.attempts}题`).join("、")}；暂不根据速度给弱项标签。`);en.push(`Insufficient samples for a fluency judgement: ${insufficient.map(x=>`${labelEn(x.skillId)} ${x.attempts} item(s)`).join(", ")}.`)}
  if(fluencyFocusSkills.length){const detail=fluencyFocusSkills.map(id=>{const m=metrics.find(x=>x.skillId===id)!;const target=profile.skills.find(s=>s.id===id)!.targetMs;return `${labelZh(id)}（中位 ${(m.medianMs/1000).toFixed(1)}s，目标 ≤ ${(target/1000).toFixed(1)}s）`}).join("、");zh.push(`准确性已达标但可提速：${detail}。这属于流畅度/巧算训练，不是“不会”。`);en.push(`Accuracy is on target but fluency can improve: ${fluencyFocusSkills.map(labelEn).join(", ")}. This is fluency/strategy work, not error remediation.`)}
  const habitThreshold=Math.max(3,Math.ceil(attempts.length*.15));const topHabit=reasons.find(x=>["impulsive","hesitation"].includes(x.code)&&x.count>=habitThreshold);
  if(topHabit?.code==="impulsive"){zh.push(`“出手过快”连续出现 ${topHabit.count} 次，才作为稳定习惯处理；下一轮会要求先判断结构再输入。`);en.push(`Impulsive responding appeared ${topHabit.count} times, enough to treat it as a stable habit.`)}
  if(topHabit?.code==="hesitation"){zh.push(`“启动慢/反复修改”连续出现 ${topHabit.count} 次，达到习惯阈值；下一轮使用同结构短组降低决策负担。`);en.push(`Slow starts/revisions appeared ${topHabit.count} times, reaching the habit threshold.`)}
  const efficiencyCount=reasons.filter(x=>["strategy_missed","slow_recall"].includes(x.code)).reduce((s,x)=>s+x.count,0);if(efficiencyCount>=2){if(fluencyFocusSkills.length)zh.push(`有 ${efficiencyCount} 题属于“答对但效率偏低”，且已形成技能级证据，下一轮针对对应结构做提速和巧算识别。`);else zh.push(`出现 ${efficiencyCount} 个单题效率信号，但还没达到技能级“提速弱项”的证据门槛，先记录并复测。`)}
 }
 return{grade,focusSkills,accuracyFocusSkills,fluencyFocusSkills,monitorSkills,focusStrategies,reasons,summaryZh:zh,summaryEn:en,metrics,strategyMetrics};
}
