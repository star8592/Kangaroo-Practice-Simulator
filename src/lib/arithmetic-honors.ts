import { GRADE_PROFILES, type ArithmeticGrade } from "./arithmetic";
import { buildArithmeticMilestone, type ArithmeticSession } from "./arithmetic-analytics";
import type { MathCard } from "./math-cardbook";

function gradeLabel(grade:ArithmeticGrade){return `G${grade}`;}

export function buildArithmeticHonorCards(sessions:ArithmeticSession[]):MathCard[]{
  const sorted=[...sessions].sort((a,b)=>a.finishedAt-b.finishedAt);
  const cards=new Map<string,MathCard>();

  for(let i=0;i<sorted.length;i++){
    const current=sorted[i];
    const history=sorted.slice(0,i);
    const milestone=buildArithmeticMilestone(current.grade,history,current);
    if(!milestone)continue;

    const grade=current.grade;
    const gradeZh=`${grade}年级计算`;
    const gradeEn=`Grade ${grade} Calculation`;

    if(milestone.code==="first_perfect_set"){
      const id=`achievement:arithmetic-perfect:g${grade}`;
      if(!cards.has(id))cards.set(id,{
        id,
        kind:"成就卡",
        title:"一题不丢",
        titleEn:"Perfect Calculation Set",
        subtitle:`${gradeZh} · 首次至少20题全对`,
        subtitleEn:`${gradeEn} · first perfect set of 20+ questions`,
        rarity:"神话",
        completedAt:current.finishedAt,
        unlockText:"至少20题全部正确，第一次做到一题不丢。",
        unlockTextEn:"Completed at least 20 questions with no mistakes for the first time.",
        href:"/arithmetic",
      });
      continue;
    }

    if(milestone.code==="accuracy_personal_best"){
      const id=`achievement:arithmetic-best:g${grade}`;
      const pct=Math.round(milestone.accuracy*100);
      const previous=cards.get(id);
      if(!previous||current.finishedAt>=previous.completedAt)cards.set(id,{
        id,
        kind:"成就卡",
        title:"个人新高",
        titleEn:"Personal Best",
        subtitle:`${gradeZh} · 正确率新高 ${pct}%`,
        subtitleEn:`${gradeEn} · new accuracy best ${pct}%`,
        rarity:pct>=96?"神话":pct>=90?"传说":pct>=80?"超稀有":"稀有",
        completedAt:current.finishedAt,
        unlockText:`正确率刷新个人最好到 ${pct}%（本次至少提升5个百分点）。`,
        unlockTextEn:`Improved the personal accuracy best to ${pct}% by at least 5 percentage points.`,
        href:"/arithmetic",
      });
      continue;
    }

    if(milestone.code==="skill_stable_recovery"&&milestone.skillId){
      const skill=GRADE_PROFILES[grade].skills.find(item=>item.id===milestone.skillId);
      const labelZh=skill?.labelZh||milestone.skillId;
      const labelEn=skill?.labelEn||milestone.skillId;
      const id=`achievement:arithmetic-stable:g${grade}:${milestone.skillId}`;
      if(!cards.has(id))cards.set(id,{
        id,
        kind:"成就卡",
        title:"稳定突破",
        titleEn:"Stable Breakthrough",
        subtitle:`${gradeZh} · ${labelZh}`,
        subtitleEn:`${gradeEn} · ${labelEn}`,
        rarity:"超稀有",
        completedAt:current.finishedAt,
        unlockText:`${labelZh} 曾是薄弱项，之后连续两轮达到准确率和速度标准。`,
        unlockTextEn:`${labelEn} was previously weak, then met accuracy and fluency targets in two consecutive rounds.`,
        href:"/arithmetic",
      });
    }
  }

  return [...cards.values()].sort((a,b)=>b.completedAt-a.completedAt);
}
