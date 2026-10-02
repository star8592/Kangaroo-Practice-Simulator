import type { ArithmeticGrade } from "@/lib/arithmetic";

export type K12GradeCrosswalk = {
  grade: ArithmeticGrade;
  international: string;
  ageBand: string;
  us: string;
  england: string;
  australia: string;
  ib: string;
};

export const K12_GRADE_BANDS = [
  { id: "primary", label: "Primary", zh: "基础阶段", range: "G1–G5", grades: [1,2,3,4,5] as ArithmeticGrade[] },
  { id: "lower-secondary", label: "Lower Secondary", zh: "进阶阶段", range: "G6–G8", grades: [6,7,8] as ArithmeticGrade[] },
  { id: "upper-secondary", label: "Upper Secondary", zh: "高阶阶段", range: "G9–G12", grades: [9,10,11,12] as ArithmeticGrade[] },
] as const;

const ibProgramme=(grade:ArithmeticGrade)=>{
  if(grade<=5)return "PYP";
  if(grade===6)return "PYP / MYP";
  if(grade<=10)return "MYP";
  return "DP / CP";
};

export const K12_GRADE_CROSSWALK = Object.fromEntries(
  Array.from({length:12},(_,i)=>{
    const grade=(i+1) as ArithmeticGrade;
    return [grade,{
      grade,
      international:`Grade ${grade}`,
      ageBand:`${grade+5}–${grade+6}`,
      us:`Grade ${grade}`,
      england:`Year ${grade+1}`,
      australia:`Year ${grade}`,
      ib:ibProgramme(grade),
    } satisfies K12GradeCrosswalk];
  }),
) as Record<ArithmeticGrade,K12GradeCrosswalk>;

export const K12_GRADE_NOTE = "年级名称按典型入学年龄做对照，不代表不同国家课程标准完全等价。K / Reception / Foundation 应作为独立学前数感轨道，不与 Grade 1 混用。";
