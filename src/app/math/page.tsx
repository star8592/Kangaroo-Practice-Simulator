import type {Metadata} from "next";
import ClassicMathShell from "@/components/ClassicMathShell";
import {listTrainingExamProfiles} from "@/lib/training-question-bank";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"国际数学竞赛｜袋鼠数学 · 澳洲 AMC · 美国 AMC｜SOC THINK",
 description:"恢复经典橘黑色国际数学竞赛主页，使用现有赛制、试卷与答题服务。",
 alternates:{canonical:"/math"},
 // Preserve legacy noindex while transitioning the old career-first sitemap; index after verified sitemap + canonical update.
 robots:{index:false,follow:false},
};

export default function Mathematics(){return <ClassicMathShell exams={listTrainingExamProfiles()}/>;}
