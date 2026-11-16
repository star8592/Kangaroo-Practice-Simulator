import type {Metadata} from "next";
import EnglishRoleHub from "@/components/EnglishRoleHub";

export const metadata:Metadata={
  title:"英语教师工作入口｜SOC THINK · English Leap",
  description:"从统一微信入口进入现有发音与单词教师工作台；各模块独立验证授课权限。",
  alternates:{canonical:"/english/teacher"},
};

export default function Page(){return <EnglishRoleHub audience="teacher"/>;}
