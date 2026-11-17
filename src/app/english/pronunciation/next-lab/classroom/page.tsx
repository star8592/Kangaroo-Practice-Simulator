import type {Metadata} from "next";
import Link from "next/link";
import NativeClassroomHistory from "@/features/english/pronunciation/NativeClassroomHistory";

export const metadata:Metadata={
 title:"AccentLab 原生课堂与历史记录候选｜SOC THINK",
 description:"SOC THINK Next.js 原生只读课堂作业报告与本人历史记录，复用统一微信身份与既有课堂服务。",
 robots:{index:false,follow:false},
};
export default function NativeClassroomHistoryPage(){
 return <div data-site-shell="content">
  <nav aria-label="位置" style={{maxWidth:1060,margin:"12px auto",padding:"0 20px",display:"flex",gap:10,fontSize:13}}>
   <Link href="/english">英语学习</Link><span> / </span>
   <Link href="/english/pronunciation/next-lab">原生跟读候选</Link><span> / </span>
   <span>课堂与历史</span>
  </nav>
  <NativeClassroomHistory/>
 </div>;
}
