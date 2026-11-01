import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";
import { adminOperationsSnapshot } from "@/lib/admin-operations";
import { readCustomerFeedbackOverview } from "@/lib/customer-feedback-admin";
import { readAdminRevenue, parseAdminPeriod, formatMinorUnits } from "@/lib/admin-business-metrics";
import { readAdminCheckoutCohort, aggregateCheckoutCohort, cohortPaidPercent } from "@/lib/admin-checkout-funnel";
import { readStorefrontAvailability } from "@/lib/store-products";
import { nativeCheckoutAllowed, nativeSettlementAllowed } from "@/lib/wechat-native-flags";
import { getSeoMonitorDashboard } from "@/lib/seo-monitor-store";
import { listTrainingExamProfiles } from "@/lib/training-question-bank";
import AdminOperationsNav from "@/components/AdminOperationsNav";
import styles from "./executive.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "经营驾驶舱 · SOC THINK",
  robots: { index: false, follow: false, noarchive: true },
};

function shanghaiDate(value: string | number) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}
function count(value: number | null) {
  return value === null ? "—" : value.toLocaleString("zh-CN");
}
function sampleSeries(daily: readonly { day: string; currency: string; paidMinor: number }[], days: number, now: Date) {
  const length = Math.min(days, 14);
  const values = new Map(daily.filter(x => x.currency === "CNY").map(x => [x.day, x.paidMinor]));
  return Array.from({ length }, (_, i) => {
    const at = new Date(now.getTime() - (length - i - 1) * 86_400_000);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
    return { day, amount: values.get(day) ?? 0 };
  });
}

type Params = { searchParams: Promise<{ days?: string | string[] }> };

export default async function AdminPage({ searchParams }: Params) {
  const session = await cookies();
  const user = userFromSessionToken(session.get(SESSION_COOKIE)?.value);
  if (!user) redirect("/admin/login");
  if (!isAdmin(user)) redirect("/");

  const period = parseAdminPeriod((await searchParams).days);
  const [revenue, accounts, feedback, seo, cohort, storefront] = await Promise.all([
    readAdminRevenue(period),
    Promise.resolve().then(() => adminOperationsSnapshot()),
    Promise.resolve().then(() => readCustomerFeedbackOverview({ days: period, limit: 100 })),
    Promise.resolve().then(() => getSeoMonitorDashboard()),
    readAdminCheckoutCohort(period),
    readStorefrontAvailability(),
  ]);
  let trainingPapers: number | null = null;
  let smartProfiles: number | null = null;
  try {
    const exams = listTrainingExamProfiles();
    trainingPapers = exams.filter(p => p.paperType !== "smart").length;
    smartProfiles = exams.length - trainingPapers;
  } catch {
    // Inventory source failure must be visible as unknown, not zero.
  }

  const connected = revenue.status === "available";
  const cny = connected ? revenue.currencies.find(x => x.currency === "CNY") : undefined;
  const revenueTotal = connected ? cny?.paidMinor ?? 0 : null;
  const paidOrders = connected ? cny?.paidOrders ?? 0 : null;
  const paidBuyers = connected ? cny?.paidBuyers ?? 0 : null;
  const pendingOrders = connected ? cny?.pendingOrders ?? 0 : null;
  const refunds = connected ? cny?.refundOrders ?? 0 : null;
  const productTotal = connected ? revenue.products.reduce((n, x) => n + x.total, 0) : null;
  const listedProducts = connected ? revenue.products.reduce((n, x) => n + x.configuredForDelivery, 0) : null;
  const cnyCohort = cohort.status === "available" ? aggregateCheckoutCohort(cohort.groups, "CNY") : null;
  const cohortRate = cnyCohort ? cohortPaidPercent(cnyCohort.paid, cnyCohort.created) : "—";
  const checkoutEnabled = nativeCheckoutAllowed();
  const settlementEnabled = nativeSettlementAllowed();
  const seoLatest = seo.latest;
  const seoHealthy = seo.siteStatus === "healthy";
  const issues = [
    ...(revenue.status === "not_configured" ? [{ title: "收费账本尚未连接", detail: "当前无法查看真实付款订单，不能把未接入显示为零收入。", type: "warning" }] : []),
    ...(revenue.status === "unavailable" ? [{ title: "收费账本读取失败", detail: "检查 PostgreSQL 只读统计链路，暂不提供收入数字。", type: "warning" }] : []),
    ...(cohort.status === "unavailable" ? [{ title: "订单过程统计不可用", detail: "该模块的只读账本汇总失败；收款金额统计与其他板块不受影响。", type: "warning" }] : []),
    ...(cnyCohort && cnyCohort.stalePending > 0 ? [{ title: `${cnyCohort.stalePending} 笔人民币订单超过24小时仍待支付`, detail: "须通过正式订单和微信对账核实，不表示这些订单一定已经付款。", type: "warning" }] : []),
    ...(!checkoutEnabled ? [{ title: "网站新付款入口当前未启用", detail: "这是收款配置开关状态，不代表已产生付款；需要核对商户授权、商品与正式支付验收。", type: "info" }] : []),
    ...(storefront.status === "unavailable" ? [{ title: "商城真实商品目录读取失败", detail: "不能把查询失败当作没有商品，请检查正式账本或交付资源文件。", type: "warning" }] : []),
    ...(storefront.status === "available" && storefront.visibleItems === 0 ? [{ title: "资料商城暂无可验证交付的展示商品", detail: "优先核对商品实际文件、商业使用权、价格和可下载交付，不把训练卷目录直接算为可售资料。", type: "info" }] : []),
    ...(seo.siteStatus !== "healthy" ? [{ title: "SEO 监测需要检查", detail: seo.siteStatus === "not_measured" ? "还没有真实采集记录。" : seo.siteStatus === "stale" ? "最近的采集记录已超过 36 小时。" : "本轮检测存在 URL 或 robots 异常。", type: "warning" }] : []),
    ...(feedback.highPriority ? [{ title: `${feedback.highPriority} 条高优先级客户反馈`, detail: "包含题目错误或报告争议，优先进入客户反馈处理台。", type: "warning" }] : []),
    { title: "搜索引擎真实收录量待接入", detail: "百度、Google、Bing 的官方站长资产尚未验证，Sitemap 数量不能冒充收录量。", type: "info" },
  ];
  const chart = connected ? sampleSeries(revenue.daily, period, new Date(revenue.asOf)) : [];
  const maxAmount = Math.max(1, ...chart.map(d => d.amount));

  return <main className={styles.shell}>
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div>
          <span className={styles.kicker}>SOC THINK / BUSINESS INTELLIGENCE</span>
          <h1>经营驾驶舱</h1>
          <p>从真实收款到搜索获客、用户增长与内容供给，一屏掌握业务状态。</p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/admin/seo">搜索专项监控</Link>
          <Link href="/">返回网站</Link>
        </div>
      </div>
      <div className={styles.heroBottom}>
        <div className={styles.liveMarker}><span aria-hidden="true" className={styles.marker}/> 来源可核验 · 北京时间 {shanghaiDate(revenue.asOf)}</div>
        <nav aria-label="经营统计周期" className={styles.periods}>
          {([7, 30, 90] as const).map(d => <Link key={d} href={`/admin?days=${d}`}
            aria-current={period === d ? "page" : undefined}
            className={period === d ? styles.periodActive : undefined}>近 {d} 天</Link>)}
        </nav>
      </div>
    </header>
    <AdminOperationsNav />

    <section aria-labelledby="income-heading" className={styles.section}>
      <div className={styles.sectionTitle}>
        <div><span className={styles.eyebrow}>01 / REVENUE</span><h2 id="income-heading">实际收款与订单</h2>
          <p>仅统计单一正式账本中已核验且当前状态为 paid 的订单。金额不等于会计收入或利润。</p></div>
        <span className={connected ? styles.sourceOkay : styles.sourceUnknown}>
          {connected ? "PostgreSQL 账本已连接" : revenue.status === "not_configured" ? "账本未配置" : "账本暂不可用"}
        </span>
      </div>
      <div className={styles.financialGrid}>
        <article className={styles.revenuePrimary}>
          <span>已核验付款金额 · CNY</span>
          <strong>{revenueTotal === null ? "—" : formatMinorUnits(revenueTotal)}</strong>
          <small>过去 {period} 天 · 当前仍为 paid 的订单 · 不含退款单</small>
          <div className={styles.paymentMeta}><span>基于服务器账本</span><span>{connected ? shanghaiDate(revenue.asOf) + " 更新" : "等待可靠数据"}</span></div>
        </article>
        <article className={styles.kpi}><span>CNY 已支付订单</span><strong>{count(paidOrders)}</strong><small>官方核验后入账，不含待支付</small></article>
        <article className={styles.kpi}><span>CNY 付款账号</span><strong>{count(paidBuyers)}</strong><small>按已核验付款人去重</small></article>
        <article className={styles.kpi}><span>CNY 待支付订单</span><strong>{count(pendingOrders)}</strong><small>包含尚未完成支付的订单</small></article>
      </div>
      <div className={styles.financeDetails}>
        <span>退款订单：{count(refunds)}</span>
        <span>平均 CNY 订单金额：{paidOrders && revenueTotal !== null ? formatMinorUnits(Math.round(revenueTotal / paidOrders)) : "—"}</span>
        <span>未核验的支付请求不会计入收款</span>
      </div>
      <div className={styles.cohortSection}>
        <div className={styles.panelTitle}><h3>订单创建 → 当前付款状态</h3><span>近 {period} 天创建的 CNY 订单（同一批订单）</span></div>
        <div className={styles.cohortTiles}>
          <div><span>创建订单</span><strong>{count(cnyCohort?.created ?? null)}</strong></div>
          <div><span>当前已支付</span><strong>{count(cnyCohort?.paid ?? null)}</strong></div>
          <div><span>仍待付款</span><strong>{count(cnyCohort?.pending ?? null)}</strong></div>
          <div><span>已关闭</span><strong>{count(cnyCohort?.closed ?? null)}</strong></div>
          <div><span>曾付款后退款</span><strong>{count(cnyCohort?.refunded ?? null)}</strong></div>
          <div><span>当前有效已支付占比</span><strong>{cohortRate}</strong></div>
        </div>
        <div className={styles.cohortFoot}>
          <span>待付款超过24小时：{count(cnyCohort?.stalePending ?? null)}</span>
          <span>新付款入口配置：{checkoutEnabled ? "已启用" : "未启用"}</span>
          <span>历史订单对账配置：{settlementEnabled ? "已启用" : "未启用"}</span>
        </div>
        <p className={styles.caption}>本区仅统计本周期创建的服务器订单及其当前状态，且可能因后续查单/退款而变化；不是访客→付款转化率。开关状态也不等于商户支付或对账服务的真实成功率。</p>
      </div>
      <div className={styles.split}>
        <article className={styles.panel}>
          <div className={styles.panelTitle}><h3>收款趋势</h3><span>人民币 · 最近 {Math.min(period, 14)} 天</span></div>
          {connected ? <div className={styles.chart} aria-label="人民币已核验付款金额日趋势">
            {chart.map(point => <div key={point.day} className={styles.barCell} title={`${point.day} · ${formatMinorUnits(point.amount)}`}>
              <span className={styles.barValue}>{point.amount ? formatMinorUnits(point.amount) : "0"}</span>
              <span className={styles.barTrack}><span className={styles.barFill} style={{ height: `${point.amount ? Math.max(5, point.amount / maxAmount * 100) : 0}%` }}/></span>
              <span className={styles.barDate}>{point.day.slice(5)}</span>
            </div>)}
          </div> : <p className={styles.empty}>真实支付账本尚不可用，因此不生成推测曲线。</p>}
          <p className={styles.caption}>收入折线仅反映当前仍为 paid 的付款订单，不将二维码生成、付款意向或搜索点击算作收入。</p>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelTitle}><h3>热销商品</h3><span>已核验支付订单</span></div>
          {connected && revenue.topProducts.length ? <div className={styles.tableWrap}>
            <table className={styles.table}><thead><tr><th>产品</th><th>已支付</th><th>金额</th></tr></thead>
              <tbody>{revenue.topProducts.map(product => <tr key={product.productId + product.currency}>
                <td><strong>{product.title}</strong><small>{product.productId}</small></td>
                <td>{product.paidOrders}</td><td>{formatMinorUnits(product.paidMinor, product.currency)}</td>
              </tr>)}</tbody></table>
          </div> : <p className={styles.empty}>{connected ? "统计周期内暂无已核验的商品订单。" : "连接真实账本后显示热销商品。"}</p>}
        </article>
      </div>
      {connected && revenue.currencies.some(row => row.currency !== "CNY") ? <div className={styles.currencyNote}>
        其他币种独立统计（不进行未经验证的汇率换算）：
        {revenue.currencies.filter(row => row.currency !== "CNY").map(row =>
          <span key={row.currency}> {row.currency} {formatMinorUnits(row.paidMinor, row.currency)} · {row.paidOrders} 单</span>)}
      </div> : null}
    </section>

    <section aria-labelledby="growth-heading" className={styles.section}>
      <div className={styles.sectionTitle}>
        <div><span className={styles.eyebrow}>02 / USERS & EXPERIENCE</span><h2 id="growth-heading">用户增长与使用信号</h2>
          <p>家长账号是账户数，登录家庭不是活跃学习人数；保留清晰的统计口径。</p></div>
        <Link href="/admin/families" className={styles.sectionLink}>查看家庭账户 →</Link>
      </div>
      <div className={styles.statGrid}>
        <article className={styles.stat}><span>累计家长账号</span><strong>{count(accounts.totalFamilies)}</strong><small>按家长账号去重</small></article>
        <article className={styles.stat}><span>今日新增家庭</span><strong>{count(accounts.createdToday)}</strong><small>北京时间自然日</small></article>
        <article className={styles.stat}><span>最近 7 天登录家庭</span><strong>{count(accounts.loggedInLast7Days)}</strong><small>已记录成功登录时间</small></article>
        <article className={styles.stat}><span>学生档案</span><strong>{count(accounts.studentProfiles)}</strong><small>已关联孩子 {count(accounts.linkedChildren)} 人</small></article>
      </div>
      <div className={styles.signalRow}>
        <div><strong>{feedback.total}</strong><span>近 {period} 天客户反馈</span></div>
        <div><strong>{feedback.highPriority}</strong><span>题目／报告争议（优先处理）</span></div>
        <Link href="/admin/feedback">进入反馈处理台 →</Link>
      </div>
    </section>

    <section aria-labelledby="search-heading" className={styles.section}>
      <div className={styles.sectionTitle}>
        <div><span className={styles.eyebrow}>03 / DISCOVERY</span><h2 id="search-heading">搜索获客与收录</h2>
          <p>先确认页面能被技术抓取，再核对搜索平台官方收录与点击，不能混用。</p></div>
        <Link href="/admin/seo" className={styles.sectionLink}>查看 SEO 详细诊断 →</Link>
      </div>
      <div className={styles.discoveryLayout}>
        <div className={styles.searchMetrics}>
          <article><span>Sitemap 公开页面</span><strong>{count(seoLatest?.sitemapCount ?? null)}</strong><small>自有 URL 总数</small></article>
          <article><span>本轮检查 / 通过</span><strong>{seoLatest ? `${seoLatest.healthyCount} / ${seoLatest.checkedCount}` : "—"}</strong><small>抓取技术抽检，不是搜索收录</small></article>
          <article><span>技术监测</span><strong className={styles.statusValue}>{seoHealthy ? "正常" : seo.siteStatus === "stale" ? "已过期" : seo.siteStatus === "issues" ? "异常" : "未采集"}</strong><small>{seoLatest ? shanghaiDate(seoLatest.observedAt) + " 最近采集" : "等待首份采样"}</small></article>
        </div>
        <div className={styles.enginePanel}>
          <div className={styles.panelTitle}><h3>搜索引擎表现</h3><span>仅认可官方数据</span></div>
          <table className={styles.table}><thead><tr><th>搜索引擎</th><th>收录页面</th><th>自然点击</th><th>状态</th></tr></thead>
            <tbody>{seo.providers.map(provider => <tr key={provider.id}><td><strong>{provider.name}</strong></td>
              <td>{provider.indexCount ?? "—"}</td><td>{provider.clicks ?? "—"}</td>
              <td><span className={styles.missing}>{provider.sourceStatus === "not_connected" ? "尚未接入" : "已连接"}</span></td>
            </tr>)}</tbody>
          </table>
          <p className={styles.caption}>IndexNow 回执、Sitemap 数量和 site: 搜索结果，都不能用于替代真实收录量。</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="stock-heading" className={styles.section}>
      <div className={styles.sectionTitle}>
        <div><span className={styles.eyebrow}>04 / SUPPLY</span><h2 id="stock-heading">内容供给与商品准备</h2>
          <p>考试训练库存和实际已上架数字商品分开统计；可训练不等于拥有商业分发授权。</p></div>
        <Link href="/resources" className={styles.sectionLink}>打开资料目录 →</Link>
      </div>
      <div className={styles.statGrid}>
        <article className={styles.stat}><span>可用训练卷</span><strong>{count(trainingPapers)}</strong><small>来自现有训练卷目录</small></article>
        <article className={styles.stat}><span>智能训练配置</span><strong>{count(smartProfiles)}</strong><small>不包含在训练卷数量中</small></article>
        <article className={styles.stat}><span>账本商品 SKU</span><strong>{count(productTotal)}</strong><small>含未启用的商品配置</small></article>
        <article className={styles.stat}><span>商城真实展示资料</span><strong>{count(storefront.visibleItems)}</strong><small>文件校验后的前台目录 · 账本配置可交付 SKU {count(listedProducts)}</small></article>
      </div>
    </section>

    <section aria-labelledby="action-heading" className={styles.section}>
      <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>05 / ACTION CENTER</span><h2 id="action-heading">需要关注的事项</h2>
        <p>只呈现来自真实记录的风险、连接缺口和下一步动作，不制造虚假告警。</p></div></div>
      <div className={styles.actionsList}>
        {issues.map(item => <article key={item.title} className={styles.actionItem}>
          <span className={item.type === "warning" ? styles.warningDot : styles.infoDot}/>
          <div><strong>{item.title}</strong><p>{item.detail}</p></div>
        </article>)}
      </div>
      <p className={styles.footnote}>收款来自已核验订单，不是财务利润；搜索收录需官方站长平台；使用次数与真正付费转化率必须在数据来源和归因链路核实后展示。</p>
    </section>
  </main>;
}
