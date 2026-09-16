import type { ExamBundle, ExamProfile, Question } from "./types";

export type GradeBand = "g12" | "g34" | "g56" | "g78" | "g910" | "g1113";
export type MixedKind = `mix-${GradeBand}` | "mixed24" | "mixed15";

type MixedSpec = {
  band: GradeBand;
  count: number;
  quotas: Record<3 | 4 | 5, number>;
  initialScore: number;
  maxScore: number;
  grades: string;
  gradesZh: string;
};

type Candidate = {
  q: Question;
  sourceExamId: string;
  sourceQuestionNo: number;
  year: number;
  country: string;
  jitter: number;
};

const SPECS: Record<GradeBand, MixedSpec> = {
  g12: { band:"g12", count:24, quotas:{3:8,4:8,5:8}, initialScore:24, maxScore:120, grades:"Grades 1–2", gradesZh:"1–2年级" },
  g34: { band:"g34", count:24, quotas:{3:8,4:8,5:8}, initialScore:24, maxScore:120, grades:"Grades 3–4", gradesZh:"3–4年级" },
  g56: { band:"g56", count:24, quotas:{3:8,4:8,5:8}, initialScore:24, maxScore:120, grades:"Grades 5–6", gradesZh:"5–6年级" },
  g78: { band:"g78", count:30, quotas:{3:10,4:10,5:10}, initialScore:30, maxScore:150, grades:"Grades 7–8", gradesZh:"7–8年级" },
  g910:{ band:"g910",count:30, quotas:{3:10,4:10,5:10}, initialScore:30, maxScore:150, grades:"Grades 9–10",gradesZh:"9–10年级" },
  g1113:{band:"g1113",count:30,quotas:{3:10,4:10,5:10},initialScore:30,maxScore:150,grades:"Grades 11–13",gradesZh:"11–13年级" },
};

export function gradeBandForProfile(profile: ExamProfile): GradeBand | null {
  const g=(profile.gradesEn || profile.grades || "").replace(/\s/g,"").toLowerCase();
  if (g === "grade2" || g.includes("1–2") || g.includes("1-2")) return "g12";
  if (g.includes("3–4") || g.includes("3-4")) return "g34";
  if (g.includes("5–6") || g.includes("5-6")) return "g56";
  if (g.includes("7–8") || g.includes("7-8")) return "g78";
  if (g.includes("9–10") || g.includes("9-10") || g === "grade9") return "g910";
  if (g.includes("11–13") || g.includes("11-13") || g.includes("10–11") || g.includes("10-11") || g === "grade12") return "g1113";
  return null;
}

function hashSeed(seed: string) {
  let h=2166136261>>>0;
  for(let i=0;i<seed.length;i+=1){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619); }
  return h>>>0;
}
function mulberry32(seed:number){ let a=seed>>>0; return()=>{ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return((t^(t>>>14))>>>0)/4294967296; }; }

function profileForBand(band:GradeBand): ExamProfile {
  const s=SPECS[band];
  return {
    id:`mix-${band}`, name:`Smart Mixed Mock · ${s.count} Questions`, grades:s.grades,
    durationSeconds:75*60, questionCount:s.count, initialScore:s.initialScore, maxScore:s.maxScore,
    wrongPenaltyMode:"quarter-points", wrongPenaltyValue:0.25, country:"Mixed", language:"zh/en",
    nameZh:`${s.gradesZh} · 历年智能混合卷`, nameEn:`${s.grades} · Smart Mixed Mock`,
    gradesZh:s.gradesZh, gradesEn:s.grades,
    sourceLabelZh:"跨年份/地区平衡组卷 · 每次生成新卷", sourceLabelEn:"Balanced across years/regions · fresh every time",
    studentReady:true,
  };
}

export function mixedProfiles(bundles:ExamBundle[]) {
  const out:ExamProfile[]=[];
  for(const band of Object.keys(SPECS) as GradeBand[]){
    const s=SPECS[band];
    const pool=bundles.filter(b=>gradeBandForProfile(b.profile)===band).flatMap(b=>b.questions);
    const enough=([3,4,5] as const).every(p=>pool.filter(q=>q.points===p).length>=s.quotas[p]);
    if(enough) out.push(profileForBand(band));
  }
  return out;
}

export function parseMixedExamId(examId:string):{kind:MixedKind;band:GradeBand;seed:string}|null {
  let m=/^(mix-(g12|g34|g56|g78|g910|g1113))-([A-Za-z0-9_-]+)$/.exec(examId);
  if(m) return {kind:m[1] as MixedKind,band:m[2] as GradeBand,seed:m[3]};
  m=/^(mixed24|mixed15)-([A-Za-z0-9_-]+)$/.exec(examId);
  if(m) return {kind:m[1] as MixedKind,band:"g12",seed:m[2]};
  return null;
}

function chooseBalanced(band:GradeBand, seed:string, bundles:ExamBundle[]) {
  const spec=SPECS[band];
  const source=bundles.filter(b=>gradeBandForProfile(b.profile)===band);
  const rand=mulberry32(hashSeed(`${band}:${seed}`));
  const candidates:Candidate[]=[];
  for(const bundle of [...source].sort((a,b)=>a.profile.id.localeCompare(b.profile.id))){
    for(const q of bundle.questions){
      candidates.push({q,sourceExamId:bundle.profile.id,sourceQuestionNo:q.questionNo,
        year:q.year||bundle.profile.year||0,country:bundle.profile.country||"Unknown",jitter:rand()});
    }
  }
  const years=[...new Set(candidates.map(c=>c.year).filter(Boolean))];
  const countries=[...new Set(candidates.map(c=>c.country))];
  const exams=[...new Set(candidates.map(c=>c.sourceExamId))];
  const yearCap=Math.max(2,Math.ceil(spec.count/Math.max(years.length,1))+1);
  const countryCap=Math.max(2,Math.ceil(spec.count/Math.max(countries.length,1))+2);
  const examCap=Math.max(2,Math.ceil(spec.count/Math.max(exams.length,1))+1);
  const selected:Candidate[]=[]; const used=new Set<string>();
  const yearCount=new Map<number,number>(), countryCount=new Map<string,number>(), examCount=new Map<string,number>();
  for(const points of [3,4,5] as const){
    const bandYear=new Map<number,number>(), bandCountry=new Map<string,number>(), posCount=new Map<number,number>();
    for(let slot=0;slot<spec.quotas[points];slot+=1){
      let options=candidates.filter(c=>c.q.points===points&&!used.has(c.q.id)
        &&(yearCount.get(c.year)??0)<yearCap&&(countryCount.get(c.country)??0)<countryCap&&(examCount.get(c.sourceExamId)??0)<examCap);
      if(!options.length) options=candidates.filter(c=>c.q.points===points&&!used.has(c.q.id));
      options.sort((a,b)=>(bandCountry.get(a.country)??0)-(bandCountry.get(b.country)??0)
        ||(bandYear.get(a.year)??0)-(bandYear.get(b.year)??0)
        ||(countryCount.get(a.country)??0)-(countryCount.get(b.country)??0)
        ||(yearCount.get(a.year)??0)-(yearCount.get(b.year)??0)
        ||(posCount.get(a.sourceQuestionNo)??0)-(posCount.get(b.sourceQuestionNo)??0)
        ||(examCount.get(a.sourceExamId)??0)-(examCount.get(b.sourceExamId)??0)
        ||a.jitter-b.jitter);
      const pick=options[0]; if(!pick) throw new Error(`Not enough ${points}-point questions for ${band}`);
      selected.push(pick); used.add(pick.q.id);
      yearCount.set(pick.year,(yearCount.get(pick.year)??0)+1); countryCount.set(pick.country,(countryCount.get(pick.country)??0)+1);
      examCount.set(pick.sourceExamId,(examCount.get(pick.sourceExamId)??0)+1); bandYear.set(pick.year,(bandYear.get(pick.year)??0)+1);
      bandCountry.set(pick.country,(bandCountry.get(pick.country)??0)+1); posCount.set(pick.sourceQuestionNo,(posCount.get(pick.sourceQuestionNo)??0)+1);
    }
  }
  return selected;
}

export function buildMixedBundle(kind:MixedKind, seed:string, bundles:ExamBundle[], forcedBand?:GradeBand):ExamBundle {
  const band=forcedBand || (kind==="mixed24"||kind==="mixed15"?"g12":kind.slice(4) as GradeBand);
  const picks=chooseBalanced(band,seed,bundles); const base=profileForBand(band);
  const questions=picks.map((c,index)=>({...c.q,questionNo:index+1,sourceMeta:{...(c.q.sourceMeta&&typeof c.q.sourceMeta==="object"&&!Array.isArray(c.q.sourceMeta)?c.q.sourceMeta as Record<string,unknown>:{}),mixedSourceExamId:c.sourceExamId,mixedSourceQuestionNo:c.sourceQuestionNo,mixedCountry:c.country}}));
  const years=[...new Set(picks.map(p=>p.year).filter(Boolean))].sort((a,b)=>a-b); const countries=[...new Set(picks.map(p=>p.country))].sort();
  const tag=seed.slice(-6).toUpperCase(); const span=years.length?`${years[0]}–${years[years.length-1]}`:"archive";
  const profile:ExamProfile={...base,id:`mix-${band}-${seed}`,name:`${base.name} #${tag}`,nameZh:`${base.nameZh} #${tag}`,nameEn:`${base.nameEn} #${tag}`,
    sourceLabelZh:`${span} · ${countries.join(" + ")} · Seed ${tag}`,sourceLabelEn:`${span} · ${countries.join(" + ")} · Seed ${tag}`};
  return {profile,questions};
}
