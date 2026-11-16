import type {Metadata} from "next";
import EnglishRoleHub from "@/components/EnglishRoleHub";

export const metadata:Metadata={
  title:"我的英语学习｜SOC THINK · English Leap",
  description:"统一进入单词、发音与阅读学习，保留原有学生账号、作业和记录。",
  alternates:{canonical:"/english/student"},
};

export default function Page(){return <EnglishRoleHub audience="student"/>;}
