import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {WuhanScoringPending} from "@/components/WuhanScoringPending";
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
 const report=await response.json();
 if(response.status===202&&report?.code==="SCORING_PENDING"&&report.attempt_id===id&&report.billable===false&&["queued","leased"].includes(report.state))return <WuhanScoringPending attemptId={id} state={report.state}/>;
 if(report?.code==="SCORING_FAILED"&&report.attempt_id===id&&report.billable===false)return <section data-site-shell="content"><h1>本次评分未完成</h1><p>没有生成有效成绩。请返回练习或联系老师，不会因本次评分失败扣次。</p><a href="/account">返回个人中心</a></section>;
 if(response.status===202)return <section data-site-shell="content"><h1>评分状态暂不可用</h1><p>请稍后刷新页面。</p></section>;
 return <WuhanResearchReport report={report}/>;
}
