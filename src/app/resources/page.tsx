import ResourceLibraryClient from "@/components/ResourceLibraryClient";
import {readRustTrainingCatalog,RustCatalogUnavailable} from "@/lib/rust-catalog-read";

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
    // Never masquerade as a healthy 200 page when Rust has failed.
    const code=e instanceof RustCatalogUnavailable?e.message:"RUST_CATALOG_UNEXPECTED";
    console.error("[resources] read-only catalog unavailable",code);
    throw new RustCatalogUnavailable("catalog-read-failed");
  }
}
