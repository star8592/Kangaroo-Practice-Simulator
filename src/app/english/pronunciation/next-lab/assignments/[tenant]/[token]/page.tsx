import type {Metadata} from "next";
import {notFound} from "next/navigation";
import Link from "next/link";
import NativeClassroomWorkflow from "@/features/english/pronunciation/NativeClassroomWorkflow";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"老师分享的 AccentLab 原生跟读作业｜SOC THINK",
 description:"使用 SOC THINK 微信身份进入老师布置的英语跟读作业。",
 robots:{index:false,follow:false,noarchive:true},
 referrer:"no-referrer",
};
type Props={params:Promise<{tenant:string;token:string}>};
export default async function SharedNativeAssignment({params}:Props){
 const {tenant,token}=await params;
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(tenant)
  || !/^[a-f0-9]{64}$/i.test(token))notFound();
 const shared="https://socthink.cn/english/pronunciation/app/a/"+tenant.toLowerCase()+"/"+token.toLowerCase();
 return <div data-site-shell="content">
  <nav aria-label="位置" style={{maxWidth:1100,margin:"12px auto",padding:"0 20px",display:"flex",gap:10,fontSize:13}}>
   <Link href="/english">英语学习</Link><span> / </span>
   <Link href="/english/pronunciation/next-lab/assignments">原生跟读作业</Link>
   <span> / </span><span>老师分享的作业</span>
  </nav>
  <NativeClassroomWorkflow initialShare={shared}/>
 </div>;
}
