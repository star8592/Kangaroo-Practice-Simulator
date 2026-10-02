import type { LearnerSignal,MasteryStage } from "../core/model";
export type EvidenceMetric={score:number|null;evidence:number;samples:number};
export type MathematicalLearnerProfile={fluency:EvidenceMetric;independence:EvidenceMetric;hintReliance:EvidenceMetric;strategyEvidence:EvidenceMetric;stageCounts:Record<MasteryStage,number>};
const STAGES:MasteryStage[]=["unknown","recognized","assisted","independent","automatic","transfer"];
const pct=(x:number)=>Math.max(0,Math.min(100,Math.round(x*100)));
export function buildLearnerProfile(signals:LearnerSignal[]):MathematicalLearnerProfile{
 const n=signals.length;const stageCounts=Object.fromEntries(STAGES.map(s=>[s,0])) as Record<MasteryStage,number>;
 for(const s of signals)stageCounts[s.stage]++;
 const evidence=Math.min(100,Math.round(n/20*100));
 const correct=signals.filter(s=>s.correct);const fastIndependent=correct.filter(s=>s.stage==="automatic"||s.stage==="transfer").length;
 const independent=correct.filter(s=>s.stage==="independent"||s.stage==="automatic"||s.stage==="transfer").length;
 const hinted=signals.filter(s=>s.hintLevel>0).length;const strategy=signals.filter(s=>Boolean(s.strategyId)&&s.transformations.length>0&&s.correct).length;
 const metric=(value:number|null):EvidenceMetric=>({score:n?value:null,evidence,samples:n});
 return {fluency:metric(n?pct(fastIndependent/n):null),independence:metric(n?pct(independent/n):null),hintReliance:metric(n?pct(hinted/n):null),strategyEvidence:metric(n?pct(strategy/n):null),stageCounts};
}
