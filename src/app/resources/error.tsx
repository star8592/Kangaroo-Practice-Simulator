"use client";
import Link from "next/link";

export default function ResourceCatalogError({reset}:{error:Error;reset:()=>void}){
  return <section role="alert" data-site-shell="content"
    style={{maxWidth:960,margin:"50px auto",padding:"0 22px"}}>
    <h1>试卷目录暂时不可用</h1>
    <p>资源目录服务当前无法提供经过验证的训练资料，请稍后重试。不会显示未经核验的试卷，也不会触发收费。</p>
    <button type="button" onClick={reset}>重新加载</button>
    <p><Link href="/math">返回数学学习</Link></p>
  </section>;
}
