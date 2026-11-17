import {cookies} from "next/headers";
import {notFound} from "next/navigation";
import {marketplaceMode,verifyMarketplaceTicket,marketplaceUserFromCookie,MARKETPLACE_COOKIE} from "@/lib/marketplace-entitlement";
import {loadTrainingExamBundle,isExamBundleTrainingReady} from "@/lib/training-question-bank";
import {loadExamAttempts} from "@/lib/attempt-store";

export const dynamic="force-dynamic";

export default async function MarketplaceClaimPage({searchParams}:{searchParams:Promise<{ticket?:string}>}) {
  if(!marketplaceMode())notFound();
  const query=await searchParams;
  const cookie=(await cookies()).get(MARKETPLACE_COOKIE)?.value;
  const user=marketplaceUserFromCookie(cookie);
  const attempts=user?loadExamAttempts(user.id,1):[];
  const last=attempts[0];

  let ticket:string|null=null,examId:string|null=null,title="AMC 8 数学模拟测评",count=25,minutes=40,error="";
  if(query.ticket){
    try {
      const verified=verifyMarketplaceTicket(query.ticket);
      const bundle=loadTrainingExamBundle(verified.examId);
      if(!isExamBundleTrainingReady(bundle)||bundle.profile.formatId!=="maa-amc8")
        throw Error("EXAM_NOT_READY");
      ticket=query.ticket;examId=verified.examId;title=bundle.profile.name;
      count=bundle.profile.questionCount;minutes=Math.ceil(bundle.profile.durationSeconds/60);
    }catch{error="兑换链接无效、已过期，或当前试卷暂不可用。请从闲鱼订单中重新打开交付链接。";}
  }
  return <section className="marketplace-claim">
    <div className="claim-eyebrow">SOC THINK · 数学测评服务</div>
    <h1>{last?"您的测评报告已完成":user?"继续您的考试":ticket?"已收到您的考试权益":"我的考试服务"}</h1>
    <p>从闲鱼购买考试服务后，直接在这里完成测评并保存专业报告，不需要再次付款。</p>
    <div className="claim-card">
      <div style={{fontSize:12,color:"#11765b",fontWeight:800}}>{user?"已领取权益":ticket?"已付款，可领取":"等待兑换"}</div>
      <h2>{title}</h2>
      <div className="claim-facts">
        <div><span>考试</span><strong>{count} 道题</strong></div>
        <div><span>时长</span><strong>{minutes} 分钟</strong></div>
        <div><span>考试权益</span><strong>{last?"已使用":"1 次"}</strong></div>
        <div><span>完成后</span><strong>PDF 报告</strong></div>
      </div>
      {last?<><a className="primary-button" href={"/report/"+encodeURIComponent(last.id)}>查看完整报告</a><p className="claim-note">您可以从报告页面再次下载 PDF，不会重复扣除考试次数。</p></>:
       user?<><a className="primary-button" href={"/exam/"+encodeURIComponent(examId||process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID||"")}>进入或继续考试</a><p className="claim-note">已兑换的权益仅绑定此浏览器的考试身份。刷新不会增加考试次数。</p></>:
       ticket?<form action="/api/marketplace/claim" method="post"><input type="hidden" name="ticket" value={ticket}/><button className="primary-button" type="submit">领取考试并继续</button></form>:
       <p role="alert" style={{color:"#9a423b"}}>{error||"请从已付款闲鱼订单中的交付链接打开本页。"}</p>}
    </div>
    <p className="claim-note">订单问题请回到闲鱼交易会话联系卖家。报告只对兑换时绑定的学习身份开放。</p>
  </section>;
}
