import type {Metadata} from "next";
import Link from "next/link";
import NativePronunciationTrial from "@/features/english/pronunciation/NativePronunciationTrial";

export const metadata:Metadata={
 title:"英语逐句跟读练习｜SOC THINK",
 description:"SOC THINK 英语逐句跟读：极慢速示范、逐词点读、录音打分与重点纠音。",
 robots:{index:false,follow:false},
};
export default function PronunciationNativeTrial(){
 return <div data-site-shell="content">
  <nav aria-label="位置" style={{display:"flex",gap:10,margin:"14px auto",maxWidth:1000,padding:"0 16px",fontSize:13}}>
   <Link href="/english">英语学习</Link><span> / </span><Link href="/english/pronunciation">发音训练</Link>
   <span> / </span><span>逐句跟读</span>
  </nav>
  <NativePronunciationTrial/>
 </div>;
}
