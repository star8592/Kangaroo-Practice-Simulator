import type { ExamProfile } from "./types";
import { applyMaaFormat, type MaaFormatId } from "./maa-amc-format";

export type GradeBand = NonNullable<ExamProfile["gradeBand"]>;
export type CompetitionId = NonNullable<ExamProfile["competitionId"]>;

export function inferGradeBand(profile: ExamProfile): GradeBand | null {
  if (profile.gradeBand) return profile.gradeBand;
  const g=(profile.gradesEn||profile.grades||"").replace(/\s/g,"").toLowerCase();
  if(g==="pre-a"||g==="grade2"||g.includes("1–2")||g.includes("1-2")) return "1-2";
  if(g.includes("3–4")||g.includes("3-4")||g==="grade3"||g==="grade4") return "3-4";
  if(g.includes("5–6")||g.includes("5-6")) return "5-6";
  if(g.includes("7–8")||g.includes("7-8")||g.includes("grade8")) return "7-8";
  if(g.includes("9–10")||g.includes("9-10")||g.includes("grade10")||g==="grade9") return "9-10";
  if(g.includes("11–13")||g.includes("11-13")||g.includes("11–12")||g.includes("11-12")||g.includes("10–11")||g.includes("10-11")||g.includes("grade12")) return "11+";
  return null;
}

function slug(x:string){return x.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"general";}
function countryZh(x:string){return ({Austria:"奥地利",Germany:"德国",Portugal:"葡萄牙"} as Record<string,string>)[x]||x;}
function kangarooSplit(count:number){if(count===15)return "1–5题每题3分，6–10题每题4分，11–15题每题5分";if(count===24)return "1–8题每题3分，9–16题每题4分，17–24题每题5分";if(count===30)return "1–10题每题3分，11–20题每题4分，21–30题每题5分";return "按试卷原始分值结构计分";}
function kangarooSplitEn(count:number){if(count===15)return "Q1–5: 3 points, Q6–10: 4 points, Q11–15: 5 points";if(count===24)return "Q1–8: 3 points, Q9–16: 4 points, Q17–24: 5 points";if(count===30)return "Q1–10: 3 points, Q11–20: 4 points, Q21–30: 5 points";return "original paper point structure";}
function kangarooRules(p:ExamProfile){return `共 ${p.questionCount} 题，限时 ${Math.round(p.durationSeconds/60)} 分钟，初始分 ${p.initialScore}，满分 ${p.maxScore}；${kangarooSplit(p.questionCount)}；答错扣该题分值的四分之一，空题不扣分。`;}
function kangarooRulesEn(p:ExamProfile){return `${p.questionCount} questions, ${Math.round(p.durationSeconds/60)} minutes, initial score ${p.initialScore}, max ${p.maxScore}; ${kangarooSplitEn(p.questionCount)}; a wrong answer loses one quarter of that question's value; blanks are not penalized.`;}
function australianAmcRules(p:ExamProfile){const m=Math.round(p.durationSeconds/60);return `30题，${m}分钟，满分135分；1–10题每题3分，11–20题每题4分，21–25题每题5分，26–30题依次6–10分；前25题选择题，后5题为0–999整数填答；答错不倒扣。`;}

export function normalizeExamProfile(input:ExamProfile):ExamProfile{
  const p={...input};
  // Legacy compatibility: old data used ambiguous "amc" for Australian AMC.
  if((p.competitionId as string|undefined)==="amc") p.competitionId="australian-amc";
  if(p.formatId?.startsWith("amc-")) p.formatId=`australian-amc-${p.formatId.slice(4)}`;
  const band=inferGradeBand(p); if(band)p.gradeBand=band;
  if(p.id.startsWith("au-amc-pre-a-")||p.formatId==="australian-amc-pre-a"){
    return {...p,competitionId:"australian-amc",formatId:"australian-amc-pre-a",paperType:p.paperType||"sample",gradeBand:"1-2",timingMode:p.timingMode||"recommended",formatLabelZh:"澳洲 AMC · Pre-A 样题赛制",formatLabelEn:"Australian AMC · Pre-A sample format"};
  }
  if(p.country==="Australia AMC"||p.competitionId==="australian-amc"){
    const b=band==="11+"?"11plus":(band||"general");
    return {...p,competitionId:"australian-amc",formatId:p.formatId||`australian-amc-standard-${b}`,paperType:p.paperType||"past",timingMode:p.timingMode||"official",formatLabelZh:p.formatLabelZh||"澳洲 AMC 正式赛制",formatLabelEn:p.formatLabelEn||"Australian AMC official format",rulesSummaryZh:p.rulesSummaryZh||australianAmcRules(p),rulesSummaryEn:p.rulesSummaryEn||`30 questions, ${Math.round(p.durationSeconds/60)} minutes, 135 points; Q1–25 multiple choice and Q26–30 integer answers 0–999; no penalty for wrong answers.`};
  }
  if(p.country==="MAA AMC"||p.competitionId==="maa-amc") {
    if(p.paperType==="practice") return {...p,competitionId:"maa-amc",timingMode:"untimed"};
    const id=(p.formatId||"") as MaaFormatId;
    if(id==="maa-amc8"||id==="maa-amc10"||id==="maa-amc12"||id==="maa-aime-classic"||id==="maa-aime-2027") return applyMaaFormat(p,id);
    return {...p,competitionId:"maa-amc"};
  }
  if(p.country==="Mixed") return p;
  if(p.country && p.country!=="Local"){
    const exact=p.gradesEn||p.grades||"general",country=slug(p.country);
    return {...p,competitionId:"kangaroo",formatId:p.formatId||`kangaroo-${country}-${slug(exact)}`,paperType:p.paperType||"past",timingMode:p.timingMode||"official",formatLabelZh:p.formatLabelZh||`袋鼠数学 · ${countryZh(p.country)} · ${p.gradesZh||p.grades}`,formatLabelEn:p.formatLabelEn||`Math Kangaroo · ${p.country} · ${exact}`,rulesSummaryZh:p.rulesSummaryZh||kangarooRules(p),rulesSummaryEn:p.rulesSummaryEn||kangarooRulesEn(p)};
  }
  return p;
}
