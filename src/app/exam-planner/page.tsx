import type {Metadata} from "next";
import ExamPlannerClient from "@/components/ExamPlannerClient";

export const metadata:Metadata={
  title:"考试管理与日历提醒 | SOCTHINK",
  description:"管理中小学、大学、语言、职业资格、考公、岗位技能等考试的报名截止、笔试、面试与成绩日期。支持本机保存并导出日历提醒。",
  alternates: { canonical: "/exam-planner" },
};

export default function ExamPlannerPage(){
  return <ExamPlannerClient/>;
}
