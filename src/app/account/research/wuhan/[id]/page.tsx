import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {WuhanResearchReport} from "@/components/WuhanResearchReport";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function ResearchReportPage({params}:{params:Promise<{id:string}>}){
 if(!voucherPreviewEnabled())notFound();
 const {id}=await params;
 if(!/^[0-9a-f]{32}$/.test(id))notFound();
 const token=(await cookies()).get(PARENT_SESSION_COOKIE)?.value;
 const user=parentFromSessionToken(token);
 if(!token||!user?.active||!(user.wechatId||user.wechatOpenId))redirect("/login?next="+encodeURIComponent("/account/research/wuhan/"+id));
 const origin=process.env.SOCTHINK_RUST_COMMERCE_INTERNAL_URL||"http://127.0.0.1:37872";
 if(!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(origin))notFound();
 let response:Response;
 try{response=await fetch(origin+"/api/platform/research/wuhan/reports/"+id,{headers:{Cookie:PARENT_SESSION_COOKIE+"="+token},cache:"no-store",signal:AbortSignal.timeout(5000)});}
 catch{return <section data-site-shell="content"><h1>研究报告暂不可用</h1><p>服务连接失败，不会生成成绩或扣次。</p></section>;}
 if(response.status===401)redirect("/login");
 if(response.status===404)notFound();
 if(!response.ok)return <section data-site-shell="content"><h1>研究报告暂不可用</h1><p>请稍后重试，不会生成成绩或扣次。</p></section>;
 return <WuhanResearchReport report={await response.json()}/>;
}
