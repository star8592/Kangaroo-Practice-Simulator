import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "订单学习入口 · SOC THINK",
  description: "SOC THINK 数学测评订单的学习入口。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Stable public landing route. This route never accepts, logs, echoes,
 * parses or redeems a buyer ticket. When the separately gated License
 * entitlement flow is integrated, it must replace this page atomically
 * with authenticated server-side redemption.
 *
 * Keeping a clear 200 page instead of a 404 avoids misleading a buyer
 * while the paid service is not yet provisioned. No fake paid status.
 */
export default function MarketplaceClaimPage() {
  return (
    <section
      aria-labelledby="marketplace-claim-title"
      style={{
        width: "min(100% - 32px, 640px)",
        margin: "clamp(32px, 5vw, 84px) auto 96px",
        background: "var(--panel, #fff)",
        border: "1px solid var(--line, #e2e8f0)",
        borderRadius: 22,
        padding: "clamp(24px, 5vw, 46px)",
        boxShadow: "var(--shadow-soft, 0 8px 24px #10284b08)",
      }}
    >
      <p style={{ margin: "0 0 14px", color: "var(--accent, #1454a8)", fontSize: 12, fontWeight: 800 }}>
        SOC THINK · 数学测评服务
      </p>
      <h1 id="marketplace-claim-title" style={{ fontSize: "clamp(28px, 5vw, 38px)", lineHeight: 1.3, margin: "0 0 18px" }}>
        订单学习入口
      </h1>
      <p style={{ color: "var(--muted, #5d6c82)", lineHeight: 1.85, margin: "0 0 22px" }}>
        当前考试兑换服务尚未开通，本页面不能验证订单或领取考试权益。
        如果您已经付款，请在原交易平台的订单会话中联系卖家处理，请勿重复付款。
      </p>
      <div style={{ background: "var(--surface-subtle, #f4f8ff)", borderRadius: 14, padding: "18px 20px", marginBottom: 22 }}>
        <strong style={{ fontSize: 14 }}>目前状态：等待订单服务启用</strong>
        <p style={{ fontSize: 13, lineHeight: 1.7, margin: "8px 0 0", color: "var(--muted, #5d6c82)" }}>
          这里不会要求再次支付，也不会在未确认订单时显示“领取成功”。
        </p>
      </div>
      <Link className="secondary-button" href="/" style={{ minHeight: 46, width: "100%", fontSize: 14 }}>
        返回 SOC THINK 首页
      </Link>
    </section>
  );
}
