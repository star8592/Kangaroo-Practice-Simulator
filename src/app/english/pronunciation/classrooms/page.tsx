import type {Metadata} from "next";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {parentFromSessionToken,PARENT_SESSION_COOKIE,isWechatNicknamePlaceholder} from "@/lib/parent-auth";
import NativeClassroomWorkflow from "@/features/english/pronunciation/NativeClassroomWorkflow";
export const metadata:Metadata={title:"英语教师班级管理｜SOC THINK",robots:{index:false,follow:false}};
export default async function TeacherClassesPage(){
 const me=parentFromSessionToken((await cookies()).get(PARENT_SESSION_COOKIE)?.value);
 if(!me?.active||!(me.wechatId||me.wechatOpenId))
  redirect("/login?next=%2Fenglish%2Fpronunciation%2Fclassrooms");
 if(isWechatNicknamePlaceholder(me.name))
  redirect("/account/profile?next=%2Fenglish%2Fpronunciation%2Fclassrooms");
 return <div data-site-shell="content"><NativeClassroomWorkflow/></div>;
}
