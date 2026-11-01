"use client";
import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import type {DetailedReport} from "@/lib/assessment-report-detail";
import {DIGITAL_SALES_POLICY_VERSION} from "@/lib/digital-sales-policy";
import {validServerQrTtl} from "@/lib/native-qr-expiry";
import styles from "@/app/assessment-center/measurement.module.css";

type Offer={available:boolean;loggedIn:boolean;owned:boolean;productId?:string;priceMinor?:number;
 currency?:"CNY";reason?:string;deliverable?:string};
type Checkout={orderId?:string;qrDataUrl?:string;qrTtlSeconds?:number;
 orderCreated?:boolean;code?:string;error?:string;status?:string};
type CheckoutStage="idle"|"creating"|"pending"|"paid"|"error";
function printDate(value:string){
 const d=new Date(value);
 return Number.isFinite(d.getTime())?d.toLocaleString("zh-CN",{hour12:false}):"—";
}
function FullReport({report}:{report:DetailedReport}){
 return <section className={styles.premiumDocument} aria-label="已解锁的完整个人探索报告">
   <header className={styles.premiumDocHead}>
     <span className={styles.eyebrowDark}>SOCTHINK · PERSONAL EXPLORATION</span>
     <h2>个人深度探索报告</h2>
     <p>{report.title} · 本次原始自评结果的结构化说明</p>
     <div className={styles.premiumDocMeta}>
       <span>问卷版本：{report.version}</span><span>生成时间：{printDate(report.generatedAt)}</span>
       <span>题目数量：{report.itemCount}</span><span>报告用途：自我探索</span>
     </div>
   </header>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>01 / EXECUTIVE SUMMARY</span><h3>结果摘要与解释原则</h3>
    <p>这不是标准化心理诊断，也不是中国人群的百分位比较。各维度是当前回答经既定正反向计分后的1—5分均值。</p>
    <div className={styles.premiumScores}>{report.dimensions.map(d=><div key={d.id}>
      <strong>{d.name}</strong><span>{d.mean.toFixed(2)} / 5</span>
      <small>{d.signal}</small>
    </div>)}</div>
   </section>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>INTERPRETATION BY INSTRUMENT</span>
    {report.instrumentId.startsWith("career")
      ? <div className={styles.premiumCareerOverview}>
         <h3>RIASEC 六类活动兴趣地图</h3>
         <p>你看到的是对六类具体活动的喜欢程度，而不是职业推荐算法。下图六条数值只在这30题问卷内部有意义；没有人群比较、胜任力预测或固定的“最佳职业”。</p>
         <div className={styles.premiumCareerGrid}>{report.dimensions.map(d=><div key={d.id}>
           <strong>{d.id}</strong><span>{d.name}</span>
           <div className={styles.scoreTrack}><span style={{width:((d.mean-1)/4*100)+"%"}}/></div>
           <small>{d.mean.toFixed(2)} / 5 · 自评均值</small>
         </div>)}</div>
         <p>建议从相对感兴趣的活动中选一次低风险体验，用完成过程与他人反馈核验，而不是立刻据此选择职业。</p>
        </div>
      : <div className={styles.premiumPersonalityOverview}>
         <h3>五维人格描述轮廓</h3>
         <p>五个维度代表五种自我描述角度，没有统一“满分人格”。每条均值来自10个正反向计分题项，不能据此判断好坏、正常异常或与别人相比的水平。</p>
         <ol>{report.dimensions.map(d=><li key={d.id}>
            <strong>{d.name}</strong><span>{d.signal}</span>
         </li>)}</ol>
         <p>下方逐一解释全部五个维度；行动计划优先选择本次偏离选项中点更明显的三个维度做生活观察，此顺序不构成显著差异检验。</p>
        </div>}
   </section>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>02 / DIMENSION REVIEW</span><h3>逐维度详解与题项证据</h3>
    {report.dimensions.map((d,index)=><article key={d.id} className={styles.premiumFactor}>
      <div className={styles.premiumFactorHeading}><span>{String(index+1).padStart(2,"0")}</span><h4>{d.name}</h4><strong>{d.mean.toFixed(2)} / 5</strong></div>
      <p><b>本次问卷中的描述：</b>{d.signal}。{d.insight}</p>
      <p><b>可能适用的场景：</b>{d.opportunity}</p>
      <p><b>不能由此推断：</b>{d.caution}</p>
      <div className={styles.premiumEvidence}><strong>对应题项 · 原始作答证据</strong>
       <p>本维度由{d.answered}题组成，其中{d.reverseItems}题采用反向计分。以下只展示你本次回答的两个代表性条目，并不构成独立效度证据。</p>
       <ul>{d.examples.map((x,i)=><li key={i}>
         “{x.text}” — 自评选项 {x.response} / 5；{x.reverse?"反向计分后":"正向计分"} {x.keyedResponse} / 5
       </li>)}</ul>
      </div>
      <p><b>7天微实验：</b>{d.experiment}</p>
      <p><b>现实核对方法：</b>{d.check}</p>
    </article>)}
   </section>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>03 / ACTION PLAN</span><h3>未来7天可执行的观察计划</h3>
    <p>以下建议不是机器预测；它们是根据所选维度安排的可验证日常任务。完成后以真实体验更新自我认识。</p>
    <ol>{report.priorities.map((p,i)=><li key={i}><strong>{p.title}</strong>
      <p>行动：{p.action}</p><p>复盘：{p.check}</p></li>)}</ol>
   </section>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>04 / RESPONSE QUALITY</span><h3>作答质量与不确定性</h3>
    <ul>{report.consistencyNotes.map((x,i)=><li key={i}>{x}</li>)}</ul>
   </section>
   <section className={styles.premiumChapter}>
    <span className={styles.eyebrowDark}>05 / TECHNICAL NOTE</span><h3>方法、来源和使用边界</h3>
    <dl className={styles.premiumMethod}>
      <div><dt>量表来源</dt><dd>{report.source}</dd></div>
      <div><dt>题项版权/许可</dt><dd>{report.license}</dd></div>
      <div><dt>计分方式</dt><dd>{report.scoring}</dd></div>
      <div><dt>验证进度</dt><dd>尚未完成中文本土信效度与适用年龄常模验证；不能报告百分位、诊断截断值或误差区间。</dd></div>
    </dl>
    <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer">查看原始量表/理论来源</a>
    <ul>{report.restrictions.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <p><Link href="/assessment-center/methodology">查看平台公开技术档案</Link></p>
   </section>
   <div className={styles.premiumPrint}>
    <button type="button" className={styles.primaryButton} onClick={()=>window.print()}>打印／保存为 PDF</button>
   </div>
   <p className={styles.premiumFooter}>SOCTHINK · 非标准化自我探索报告。只反映当次作答，不是心理医疗诊断或职业资格证书。</p>
 </section>;
}

export default function ReportPremiumPanel({instrumentId,answers}:{
 instrumentId:string;answers:Readonly<Record<string,number>>;
}){
 const [offer,setOffer]=useState<Offer|null>(null);
 const [loadingOffer,setLoadingOffer]=useState(true);
 const [ack,setAck]=useState(false);
 const [stage,setStage]=useState<CheckoutStage>("idle");
 const [orderId,setOrderId]=useState<string|null>(null);
 const [qr,setQr]=useState<string|null>(null);
 const [deadline,setDeadline]=useState<number|null>(null);
 const [remaining,setRemaining]=useState(0);
 const [error,setError]=useState("");
 const [generating,setGenerating]=useState(false);
 const [full,setFull]=useState<DetailedReport|null>(null);
 useEffect(()=>{
  let active=true;
  fetch("/api/assessment-reports/offer?instrumentId="+encodeURIComponent(instrumentId),
   {credentials:"same-origin",cache:"no-store"})
   .then(async r=>({ok:r.ok,data:await r.json() as Offer}))
   .then(({ok,data})=>{
      if(!active)return;
      setOffer(ok?data:{available:false,loggedIn:false,owned:false,reason:"REPORT_SERVICE_UNAVAILABLE"});
      setLoadingOffer(false);
   }).catch(()=>{
      if(!active)return;
      setOffer({available:false,loggedIn:false,owned:false,reason:"NETWORK_ERROR"});
      setLoadingOffer(false);
   });
  return ()=>{active=false;};
 },[instrumentId]);
 useEffect(()=>{
  if(stage!=="pending"||!orderId)return;
  let alive=true;
  const check=async()=>{
   try{
    const r=await fetch("/api/payments/wechat/orders/"+encodeURIComponent(orderId),
       {credentials:"same-origin",cache:"no-store"});
    if(!r.ok||!alive)return;
    const data:Checkout=await r.json();
    if(data.status==="paid"){setStage("paid");setQr(null);setOffer(prev=>prev?{...prev,owned:true}:prev);}
    if(data.status==="closed"||data.status==="refunded"){
      setStage("error");setQr(null);setError("订单已结束，详细报告尚未解锁。");
    }
   }catch{ /* transport failures do not imply payment success */ }
  };
  void check();
  const timer=setInterval(()=>{void check();setRemaining(deadline?Math.max(0,Math.ceil((deadline-Date.now())/1000)):0);},3000);
  return ()=>{alive=false;clearInterval(timer);};
 },[stage,orderId,deadline]);
 async function checkout(){
  if(!offer?.available||!offer.productId||!offer.loggedIn||!ack||stage!=="idle")return;
  setStage("creating");setError("");
  try{
   const r=await fetch("/api/payments/wechat/checkout",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({productId:offer.productId,policyAccepted:true,policyVersion:DIGITAL_SALES_POLICY_VERSION})
   });
   const body:Checkout=await r.json();
   if(body.orderCreated && body.orderId && !body.qrDataUrl){
    setOrderId(body.orderId);setQr(null);setDeadline(null);setStage("pending");
    setError("原订单可能已创建，系统将继续核验，请勿重复购买。");return;
   }
   if(!r.ok||!body.orderId||!body.qrDataUrl||!validServerQrTtl(body.qrTtlSeconds)){
     setError(body.error||"微信支付暂时不可用");setStage("error");return;
   }
   setOrderId(body.orderId);setQr(body.qrDataUrl);
   setDeadline(Date.now()+body.qrTtlSeconds*1000);setRemaining(body.qrTtlSeconds);
   setStage("pending");
  }catch{setError("网络中断；如果订单已创建请在账户里检查，勿重复付款。");setStage("error");}
 }
 async function generate(){
  if(!offer?.owned||generating)return;
  setGenerating(true);setError("");
  try{
   const r=await fetch("/api/assessment-reports/full",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({instrumentId,answers})
   });
   const response: {report?:DetailedReport;code?:string}=await r.json();
   if(!r.ok||!response.report){setError(response.code||"报告权益或答案校验失败");return;}
   setFull(response.report);
  }catch{setError("暂时无法取得完整报告，请稍后重试。");}
  finally{setGenerating(false);}
 }
 return <section className={styles.premiumShell} aria-label="详细报告与付费说明">
  <header className={styles.premiumOfferHeader}>
    <div><span className={styles.eyebrowDark}>DETAILED REPORT · OPTIONAL UPGRADE</span>
      <h3>解读不止一个分数。购买更完整的个人探索报告。</h3>
      <p>免费简报已显示本次主要自评倾向。详细版包含全部维度、题项作答证据、场景解释、7天行动计划与完整方法声明。</p></div>
  </header>
  <p className={styles.premiumPreviewLink}><Link href="/assessment-center/report-preview">购买前，先查看完整版式与交付范围（虚构样稿）→</Link></p>
  <div className={styles.premiumInclusions}>
    <span>全部维度的原始计分与解释</span><span>本人题项作答的可核对证据</span>
    <span>逐维度情境与不适用情境</span><span>可执行的7天自我观察计划</span>
    <span>响应一致性提示</span><span>计分方法、来源和常模缺失说明</span>
  </div>
  <p className={styles.premiumDisclaimer}>这是一份基于你本次回答生成的非标准化自我探索服务，不是由持牌心理师签署的诊断报告，不保证职业成功或其他预测结果。当前不会记录你的答卷；只有你主动点击“生成完整报告”，答案才会发送本站服务器即时计算，不作持久存储。</p>
  {full?<FullReport report={full}/>:
   <div className={styles.premiumAction}>
    {loadingOffer?<p role="status">正在核查报告商品与付款权限…</p>:
     offer?.owned?<><p><strong>已持有本量表完整版权益</strong>。本次答案可以重新生成详细报告，不重复收费。</p>
       <button type="button" className={styles.primaryButton} onClick={()=>void generate()} disabled={generating}>
         {generating?"正在生成…":"使用已购权益生成完整报告"}</button></>:
     !offer?.available?<><p><strong>完整报告付费功能准备中。</strong> 目前没有已审核、已启用的真实报告商品，暂不能下单或扣款；请先使用上方免费简报。</p><Link href="/assessment-center/methodology">先查看科学证据与报告范围</Link></>:
     !offer.loggedIn?<><p><strong>完整报告价格：¥{((offer.priceMinor??0)/100).toFixed(2)}</strong>（单量表买断，可重新测评后再次生成）。购买前请先完成微信登录。</p>
       <p>答卷仅留在本页内存，跳转登录后需要重新作答；不会悄悄保留你的敏感答案。</p>
       <Link href={"/login?next="+encodeURIComponent("/assessment-center/"+instrumentId)}>微信登录后重新测评</Link></>:
     <><p><strong>完整报告实际价格：¥{((offer.priceMinor??0)/100).toFixed(2)}</strong>（一次买断同一种量表的完整版报告权益；购买后可重新生成，不自动订阅）。</p>
       {stage==="idle"&&<><label className={styles.consent}>
         <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>
         我确认购买的是非标准化自我探索解读服务；数字内容交付后不支持无理由退款，依法享有的售后权利不受影响。
        </label><p><Link href="/digital-purchase-policy">查看完整数字服务购买与售后规则</Link></p>
        <button type="button" className={styles.primaryButton} disabled={!ack} onClick={()=>void checkout()}>确认后微信扫码购买</button></>}
       {stage==="creating"&&<p role="status">正在向正式订单服务创建订单…</p>}
       {stage==="pending"&&<div role="status"><strong>微信正式订单待核实</strong>
         {qr&&remaining>0?<><Image src={qr} width={224} height={224} alt="本订单微信支付二维码" unoptimized/>
           <p>二维码剩余约 {Math.ceil(remaining/60)} 分钟；支付状态由服务器核实，不依赖本页提示。</p></>:
           <p>二维码已到期或原订单状态待查。请勿自行再次发起付款。</p>}
         {error&&<p>{error}</p>}
       </div>}
       {stage==="paid"&&<p role="status">付款状态已核实，当前账号完整版权益已到账。点击下方按钮生成个人报告。</p>}
       {stage==="paid"&&<button type="button" className={styles.primaryButton} disabled={generating} onClick={()=>void generate()}>生成完整个人探索报告</button>}
       {stage==="error"&&<p role="alert">{error} 如已支付，请在“我的账号”核查订单。</p>}
     </>}
    {error&&stage!=="error"&&stage!=="pending"&&<p role="alert">{error}</p>}
   </div>}
 </section>;
}
