import type {Metadata} from "next";
import JoinClassClient from "@/features/english/pronunciation/JoinClassClient";
export const metadata:Metadata={
 title:"加入英语班级｜SOC THINK",
 robots:{index:false,follow:false},
 referrer:"no-referrer",
};
export default async function JoinPage({params}:{params:Promise<{tenant:string;classId:string;token:string}>}){
 const p=await params;
 return <div data-site-shell="content" style={{maxWidth:630,margin:"24px auto",padding:24}}>
  <h1>加入老师的英语班级</h1>
  <p>使用你现有的 SOC THINK 微信账号即可申请；由任课老师确认后建立师生关系。</p>
  <JoinClassClient tenant={p.tenant} classId={p.classId} token={p.token}/>
 </div>;
}
