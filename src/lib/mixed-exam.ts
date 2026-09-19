import type { ExamBundle, ExamProfile, Question } from "./types";
import { normalizeExamProfile } from "./competition-format";

type Candidate={q:Question;sourceExamId:string;sourceQuestionNo:number;year:number;jitter:number};
type SmartSpec={count:number;quotas:Record<number,number>;profile:ExamProfile;formatId:string};

function hashSeed(seed:string){let h=2166136261>>>0;for(let i=0;i<seed.length;i+=1){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry32(seed:number){let a=seed>>>0;return()=>{a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function normalized(b:ExamBundle):ExamBundle{return {...b,profile:normalizeExamProfile(b.profile)}}
function pointDistribution(qs:Question[]){const out:Record<number,number>={};for(const q of qs)out[q.points]=(out[q.points]||0)+1;return out}
function sameRules(a:ExamProfile,b:ExamProfile){return a.questionCount===b.questionCount&&a.durationSeconds===b.durationSeconds&&a.initialScore===b.initialScore&&a.maxScore===b.maxScore&&a.wrongPenaltyMode===b.wrongPenaltyMode&&a.wrongPenaltyValue===b.wrongPenaltyValue&&(a.blankScoreValue??0)===(b.blankScoreValue??0)}

function groups(bundles:ExamBundle[]){
 const map=new Map<string,ExamBundle[]>();
 for(const raw of bundles){const b=normalized(raw),p=b.profile;if(!p.formatId||!p.competitionId||p.paperType==="smart"||p.paperType==="practice")continue;const a=map.get(p.formatId)||[];a.push(b);map.set(p.formatId,a)}
 return map;
}
function specForGroup(formatId:string,set:ExamBundle[]):SmartSpec|null{
 if(set.length<2)return null;
 const base=[...set].sort((a,b)=>(b.profile.year||0)-(a.profile.year||0)||b.profile.id.localeCompare(a.profile.id))[0].profile;if(!set.every(b=>sameRules(base,b.profile)))return null;
 const quotas=pointDistribution(set[0].questions);
 if(Object.values(quotas).reduce((a,b)=>a+b,0)!==base.questionCount)return null;
 const enough=Object.entries(quotas).every(([pts,n])=>set.reduce((s,b)=>s+b.questions.filter(q=>q.points===Number(pts)).length,0)>=n);
 if(!enough)return null;
 return {count:base.questionCount,quotas,profile:base,formatId};
}
function smartProfile(spec:SmartSpec):ExamProfile{
 const b=spec.profile,labelZh=b.formatLabelZh||b.nameZh||b.name,labelEn=b.formatLabelEn||b.nameEn||b.name;
 return {...b,id:`smart-${spec.formatId}`,name:`${labelEn} · Smart Mock`,nameZh:`${labelZh} · 智能组卷`,nameEn:`${labelEn} · Smart Mock`,country:"Mixed",paperType:"smart",sourceLabelZh:"仅从同一赛制模板的已校验试卷中智能选题 · 每次生成新卷",sourceLabelEn:"Smart selection only from verified papers using this exact format · fresh paper each time",studentReady:true};
}
export function mixedProfiles(bundles:ExamBundle[]){const out:ExamProfile[]=[];for(const [id,set] of groups(bundles)){const s=specForGroup(id,set);if(s)out.push(smartProfile(s))}return out.sort((a,b)=>(a.competitionId||"").localeCompare(b.competitionId||"")||(a.gradeBand||"").localeCompare(b.gradeBand||"")||a.id.localeCompare(b.id))}
export function parseSmartExamId(id:string){const m=/^(smart-.+)--([A-Za-z0-9_]+)$/.exec(id);return m?{baseId:m[1],formatId:m[1].slice(6),seed:m[2]}:null}

function choosePositionBalanced(spec:SmartSpec,seed:string,set:ExamBundle[]){
 const rand=mulberry32(hashSeed(`${spec.formatId}:position:${seed}`)),candidates:Candidate[]=[];
 for(const bundle of [...set].sort((a,b)=>a.profile.id.localeCompare(b.profile.id))){
  for(const q of bundle.questions)candidates.push({q,sourceExamId:bundle.profile.id,sourceQuestionNo:q.questionNo,year:q.year||bundle.profile.year||0,jitter:rand()});
 }
 const selected:Candidate[]=[],examCount=new Map<string,number>(),yearCount=new Map<number,number>();
 for(let position=1;position<=spec.count;position+=1){
  const options=candidates.filter(c=>c.sourceQuestionNo===position);
  options.sort((a,b)=>(examCount.get(a.sourceExamId)||0)-(examCount.get(b.sourceExamId)||0)||(yearCount.get(a.year)||0)-(yearCount.get(b.year)||0)||a.jitter-b.jitter);
  const pick=options[0];
  if(!pick)throw new Error(`Missing source position Q${position} for ${spec.formatId}`);
  selected.push(pick);
  examCount.set(pick.sourceExamId,(examCount.get(pick.sourceExamId)||0)+1);
  yearCount.set(pick.year,(yearCount.get(pick.year)||0)+1);
 }
 return selected;
}

function chooseBalanced(spec:SmartSpec,seed:string,set:ExamBundle[]){
 if(spec.profile.competitionId==="maa-amc")return choosePositionBalanced(spec,seed,set);
 const rand=mulberry32(hashSeed(`${spec.formatId}:${seed}`)),candidates:Candidate[]=[];
 for(const bundle of [...set].sort((a,b)=>a.profile.id.localeCompare(b.profile.id)))for(const q of bundle.questions)candidates.push({q,sourceExamId:bundle.profile.id,sourceQuestionNo:q.questionNo,year:q.year||bundle.profile.year||0,jitter:rand()});
 const years=[...new Set(candidates.map(c=>c.year).filter(Boolean))],exams=[...new Set(candidates.map(c=>c.sourceExamId))];
 const yearCap=Math.max(2,Math.ceil(spec.count/Math.max(years.length,1))+1),examCap=Math.max(2,Math.ceil(spec.count/Math.max(exams.length,1))+1);
 const selected:Candidate[]=[],used=new Set<string>(),yearCount=new Map<number,number>(),examCount=new Map<string,number>();
 for(const points of Object.keys(spec.quotas).map(Number).sort((a,b)=>a-b)){
  const posCount=new Map<number,number>();
  for(let slot=0;slot<spec.quotas[points];slot+=1){
   let options=candidates.filter(c=>c.q.points===points&&!used.has(c.q.id)&&(yearCount.get(c.year)||0)<yearCap&&(examCount.get(c.sourceExamId)||0)<examCap);
   if(!options.length)options=candidates.filter(c=>c.q.points===points&&!used.has(c.q.id));
   options.sort((a,b)=>(yearCount.get(a.year)||0)-(yearCount.get(b.year)||0)||(examCount.get(a.sourceExamId)||0)-(examCount.get(b.sourceExamId)||0)||(posCount.get(a.sourceQuestionNo)||0)-(posCount.get(b.sourceQuestionNo)||0)||a.jitter-b.jitter);
   const pick=options[0];if(!pick)throw new Error(`Not enough ${points}-point questions for ${spec.formatId}`);
   selected.push(pick);used.add(pick.q.id);yearCount.set(pick.year,(yearCount.get(pick.year)||0)+1);examCount.set(pick.sourceExamId,(examCount.get(pick.sourceExamId)||0)+1);posCount.set(pick.sourceQuestionNo,(posCount.get(pick.sourceQuestionNo)||0)+1);
  }
 }
 return selected;
}
export function buildSmartBundle(baseId:string,seed:string,bundles:ExamBundle[]):ExamBundle{
 const formatId=baseId.startsWith("smart-")?baseId.slice(6):baseId,set=groups(bundles).get(formatId)||[],spec=specForGroup(formatId,set);if(!spec)throw new Error(`Smart format unavailable: ${formatId}`);
 const picks=chooseBalanced(spec,seed,set),base=smartProfile(spec),tag=seed.slice(-6).toUpperCase();
 const questions=picks.map((c,index)=>({...c.q,questionNo:index+1,sourceMeta:{...(c.q.sourceMeta&&typeof c.q.sourceMeta==="object"&&!Array.isArray(c.q.sourceMeta)?c.q.sourceMeta as Record<string,unknown>:{}),smartSourceExamId:c.sourceExamId,smartSourceQuestionNo:c.sourceQuestionNo,smartFormatId:formatId}}));
 return {profile:{...base,id:`${baseId}--${seed}`,name:`${base.name} #${tag}`,nameZh:`${base.nameZh} #${tag}`,nameEn:`${base.nameEn} #${tag}`},questions};
}
