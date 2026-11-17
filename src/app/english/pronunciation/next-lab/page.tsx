import type {Metadata} from "next";
import Link from "next/link";
import NativePronunciationTrial from "@/features/english/pronunciation/NativePronunciationTrial";

export const metadata:Metadata={
 title:"Next.js 原生发音训练候选｜SOC THINK",
 description:"SOC THINK 统一 Next.js 前端迁移候选：真实 Rust 句子目录、示范音、跟读与评分链路测试。",
 robots:{index:false,follow:false},
};
export default function PronunciationNativeTrial(){
 return <div data-site-shell="content">
  <nav aria-label="位置" style={{display:"flex",gap:10,margin:"14px auto",maxWidth:1000,padding:"0 16px",fontSize:13}}>
   <Link href="/english">英语学习</Link><span> / </span><Link href="/english/pronunciation">发音训练</Link>
   <span> / </span><span>Next.js 迁移候选</span>
  </nav>
  <NativePronunciationTrial/>
 </div>;
}
