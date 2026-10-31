import Link from "next/link";
import {DIGITAL_SALES_POLICY_VERSION,DIGITAL_SALES_POLICY_SHORT_ZH} from "@/lib/digital-sales-policy";

export const metadata={title:"数字商品购买与售后规则 · SOCTHINK",alternates:{canonical:"/digital-purchase-policy"}};

export default function DigitalPurchasePolicyPage(){
  return <div className="legal-page">
    <h1>数字商品购买与售后规则</h1>
    <p><strong>{DIGITAL_SALES_POLICY_SHORT_ZH}</strong></p>
    <h2>一、商品类型和交付范围</h2>
    <p>本站按商品分别披露单份试卷、可下载数字资料、在线考试／题解访问权限和订阅服务的实际内容、版本、价格、可使用期限及交付或开通条件。不同商品的交付状态不同，不能仅凭“虚拟商品”四字推断一切法定退费权利均消失。</p>
    <h2>二、付款前显著告知与主动确认</h2>
    <p>请核对适用年级、考试版本、资料目录、文件格式、购买账号、交付方式和使用期限。结算时按具体商品主动勾选本规则，确认框默认不勾选；未确认的请求不能创建微信支付订单。订单保留确认的规则版本与服务器时间。</p>
    <h2>三、交付或开通后的原则：不支持无理由退款</h2>
    <p>在适用法律允许的范围内，已交付可复制、可下载的数字资料，以及已按约开通并开始提供的试卷、在线考试等数字内容，不接受仅因买错、改变主意、已经阅读、已经做题或下载后不再需要而提出的无理由退款。网站不提供用户自助申请退款或自动退款处理功能。</p>
    <h2>四、在线服务、预付服务与法定异常</h2>
    <p>若服务尚未履行、商品未交付、文件无法使用且经合理修复仍不符合约定、内容与承诺严重不符，或者其他依法应承担退还价款、继续履行、修复等责任的情形，依法按实际订单、证据和商品类型核查处理。预付式或订阅服务应遵守有关预付款、合同解除和未消费余额的强制规定。本条款不免除法定义务。</p>
    <h2>五、售后与订单证据</h2>
    <p>购买信息与订单归属同一已验证的微信账号。请先在 <Link href="/account">我的订单与权益</Link> 查看支付和交付记录。如遇交付失败或其他法定异常，通过网站公布的经营者联系渠道或微信支付官方消费者投诉渠道提交具体订单与证据，由人工核查；本站不设置常规自助退款按钮。任何确需依法退还的资金须以官方交易最终状态为准，不能仅凭申请受理即擅自撤销已购权益。</p>
    <p>此前同意的条款版本仍独立存档：<Link href="/digital-purchase-policy/v1">2026-10-31 V1 原文</Link>。</p>
    <p>版本：{DIGITAL_SALES_POLICY_VERSION}</p>
    <p><Link href="/membership">返回考试和资料购买页</Link></p>
  </div>;
}
