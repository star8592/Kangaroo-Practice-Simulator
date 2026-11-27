import Link from "next/link";
import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {isSiteOwner} from "@/lib/site-owner";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import {readAdminVoucherOverview,parseVoucherFilters} from "@/lib/commerce/admin-voucher-overview";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "../executive.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"商业运营 · 卡券管理",robots:{index:false,follow:false,noarchive:true}};
const labels:Record<string,string>={all:"全部",unclaimed:"待激活",activated:"已激活",expired:"已过期",refunded:"已退款",inconsistent:"待核对"};
const channels:Record<string,string>={xiaohongshu:"小红书",douyin:"抖音",taobao:"淘宝"};
const titles:Record<string,string>={"wh-ls-2027-entry":"基础训练卡","wh-ls-2027-standard":"考前畅练卡"};
export default async function CommerceAdmin({searchParams}:{searchParams:Promise<{state?:string;q?:string}>}){
 if(!voucherPreviewEnabled())notFound();
 const user=parentFromSessionToken((await cookies()).get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active)redirect("/login?next=%2Fadmin%2Fcommerce");
 if(!isSiteOwner(user))notFound();
 const filters=parseVoucherFilters(await searchParams);
 const data=await readAdminVoucherOverview(filters).catch(()=>null);
 return <div className={styles.shell}>
 <AdminOperationsNav commercePreview/>
 <header className={styles.hero}><div className={styles.heroTop}><div><span className={styles.kicker}>SOC THINK / COMMERCE</span><h1>卡券与渠道订单</h1><p>内部测试 · 只读真实隔离账本，不发券、不退款、不接受真实订单。</p></div><div className={styles.heroActions}><Link href="/admin">经营驾驶舱</Link></div></div></header>
 {!data?<p role="alert" className={styles.empty}>卡券账本读取失败，不能确认数量或金额。</p>:<>
 <section className={styles.statGrid} aria-label="卡券状态">
 {(["unclaimed","activated","expired","refunded"] as const).map(key=><article className={styles.stat} key={key}><span>{labels[key]}</span><strong>{data.counts[key]}</strong></article>)}
 </section>
 <p className={styles.currencyNote}>待激活已付金额：¥{(Number(data.counts.unclaimed_paid_minor)/100).toFixed(2)} · 独立于已关联的中央订单，不重复统计。总券数：{data.counts.total}</p>
 <section className={styles.section}><div className={styles.panel}>
 <div className={styles.panelTitle}><h3>卡券列表</h3><span>最多100条 · 不显示券码或券码摘要</span></div>
 <form action="/admin/commerce" method="get" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
 <label>状态 <select name="state" defaultValue={filters.state}>{Object.keys(labels).filter(k=>k!=="inconsistent").map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></label>
 <label>订单或账号 <input name="q" defaultValue={filters.q} maxLength={128} placeholder="精确订单号 / 账号ID"/></label><button type="submit">查询</button><Link href="/admin/commerce">重置</Link></form>
 <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>渠道</th><th>订单 / 件</th><th>商品</th><th>实付</th><th>状态</th><th>账号</th><th>评分余额</th><th>中央订单</th></tr></thead><tbody>
 {data.rows.map(r=><tr key={JSON.stringify([r.channel,r.merchant_id,r.order_line_id,r.unit_index])}><td>{channels[r.channel]??r.channel}</td><td>{r.order_line_id} / {r.unit_index+1}</td><td>{titles[r.sku]??r.sku}</td><td>¥{(Number(r.amount_minor)/100).toFixed(2)}</td><td>{labels[r.status]??"待核对"}</td><td>{r.owner_id??"未绑定"}</td><td>{r.remaining===null?"—":r.remaining+" / "+r.capacity}</td><td>{r.central_order_id??"未关联"}</td></tr>)}
 </tbody></table></div>{!data.rows.length&&<p className={styles.empty}>没有符合条件的卡券记录。</p>}
 </div></section></>}
 </div>;
}
