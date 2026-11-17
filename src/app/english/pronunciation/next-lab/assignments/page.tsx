import type {Metadata} from "next";
import Link from "next/link";
import NativeClassroomWorkflow from "@/features/english/pronunciation/NativeClassroomWorkflow";

export const metadata:Metadata={
 title:"AccentLab 原生跟读作业候选｜SOC THINK",
 description:"统一微信账号的原生教师作业布置、学生领取录音和真实评分流程。",
 robots:{index:false,follow:false},
};
export default function NativeAssignmentsPage(){
 return <div data-site-shell="content">
  <nav aria-label="位置" style={{display:"flex",gap:10,fontSize:13,maxWidth:1100,margin:"12px auto",padding:"0 20px"}}>
   <Link href="/english">英语学习</Link><span> / </span>
   <Link href="/english/pronunciation/next-lab">原生发音候选</Link><span> / </span>
   <span>原生跟读作业</span>
  </nav>
  <NativeClassroomWorkflow/>
 </div>;
}
