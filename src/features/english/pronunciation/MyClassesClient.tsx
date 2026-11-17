"use client";
import MyLearningClasses from "@/features/platform/MyLearningClasses";
import Link from "next/link";
export default function MyClassesClient(){
 return <div>
  <MyLearningClasses/>
  <p style={{marginTop:15}}><Link href="/english/pronunciation/app/">返回英语发音自主练习</Link></p>
 </div>;
}
