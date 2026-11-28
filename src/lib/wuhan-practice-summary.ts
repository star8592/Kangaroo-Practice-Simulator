// R79 machine content evidence only. Never produce an official exam score.
// No inference from raw transcript or merely from a candidate status.
type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
export type PracticeKind="match"|"mismatch"|"silence"|"blank"|"uncertain"|"legacy"|"invalid";
export type PracticeRow={kind:PracticeKind;revision?:string;earned?:0|1};
export function practiceRow(value:unknown):PracticeRow|null{
 const t=obj(value);
 if(t.kind!=="answer")return null;
 if(t.state==="not_submitted"||t.state==="pending")return t.candidate===null?{kind:"blank"}:{kind:"invalid"};
 const c=obj(t.candidate),p=obj(c.practice_content);
 const revision=typeof c.machine_rule_revision==="string"&&/^[a-f0-9]{64}$/.test(c.machine_rule_revision)?c.machine_rule_revision:undefined;
 if(c.official_score!==false||c.reference_content_score!==null||c.human_review_required!==true||c.status!==t.state)return {kind:"invalid"};
 if(!revision)return c.practice_content===undefined||c.practice_content===null?{kind:"legacy"}:{kind:"invalid"};
 if(t.state==="needs_review")return c.practice_content===null?{kind:"uncertain",revision}:{kind:"invalid"};
 const expected=t.state==="reference_match"?["match",1,"automatic_content_match"] as const:
 t.state==="known_mismatch"?["mismatch",0,"automatic_known_mismatch"] as const:
 t.state==="unanswered"?["silence",0,"no_answer_audio"] as const:null;
 if(!expected||p.earned!==expected[1]||p.possible!==1||p.basis!==expected[2])return {kind:"invalid"};
 return {kind:expected[0],earned:expected[1],revision};
}
export function practiceSummary(items:unknown[]){
 const rows=items.map(practiceRow).filter((r):r is PracticeRow=>r!==null);
 const counts:Record<PracticeKind,number>={match:0,mismatch:0,silence:0,blank:0,uncertain:0,legacy:0,invalid:0};
 const revisions=new Set<string>();
 for(const r of rows){counts[r.kind]++;if(r.revision)revisions.add(r.revision)}
 const decided=counts.match+counts.mismatch;
 // Silence is an observed unanswered recording, not a scored incorrect answer.
 // Only clear spoken answers enter the displayed decided-answer denominator.
 const comparable=rows.length===7&&revisions.size===1&&counts.invalid===0&&counts.legacy===0;
 return {total:rows.length,counts,decided,hasMachineEvidence:revisions.size>0,
  mixedRevision:revisions.size>1,comparable,points:comparable&&decided>0?{earned:counts.match,possible:decided}:null};
}
