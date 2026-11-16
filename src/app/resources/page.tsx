import ResourceLibraryClient from "@/components/ResourceLibraryClient";
import {readRustTrainingCatalog,RustCatalogUnavailable} from "@/lib/rust-catalog-read";
import Link from "next/link";

export const dynamic="force-dynamic";
export const metadata={
  title:"试卷资料检索与在线练习 | SOCTHINK",
  description:"按竞赛、年份与年级查找已核查的数学练习试卷；直接进入在线练习。未开放未经授权的商业下载或付费。",
  alternates:{canonical:"/resources"},
};

export default async function ResourceLibraryPage(){
  try{
    // The catalogue is now read from the single Rust business-core authority.
    // The React client may filter visible rows but cannot create approved papers.
    const rows=await readRustTrainingCatalog();
    return <ResourceLibraryClient resources={rows}/>;
  }catch(e){
    // Never silently re-enable the legacy TypeScript catalogue path.
    const code=e instanceof RustCatalogUnavailable?e.message:"RUST_CATALOG_UNEXPECTED";
    console.error("[resources] read-only catalog unavailable",code);
    return <section role="status" data-site-shell="content" style={{maxWidth:960,margin:"50px auto",padding:"0 22px"}}>
      <h1>试卷目录暂时不可用</h1>
      <p>资源目录服务当前无法提供经过验证的训练资料，请稍后重新访问。不会显示未经核验的试卷，也不会触发收费。</p>
      <Link href="/math">返回数学学习</Link>
    </section>;
  }
}
