import Link from "next/link";
import {DIGITAL_SALES_POLICY_VERSION,DIGITAL_SALES_POLICY_SHORT_ZH} from "@/lib/digital-sales-policy";

export const metadata={title:"数字商品购买与售后规则 · SOCTHINK"};

export default function DigitalPurchasePolicyPage(){
  return <main className="legal-page">
    <h1>数字商品购买与售后规则</h1>
    <p><strong>{DIGITAL_SALES_POLICY_SHORT_ZH}</strong></p>
    <h2>一、适用范围</h2>
    <p>适用于本站已实际开放购买的在线考试、单份试卷、题解、数字资料下载与其他数字服务。各商品的具体内容、价格、交付形式和有效期以付款前商品页面的明确说明为准。</p>
    <h2>二、付款前确认</h2>
    <p>请认真核对考试版本、适用年级、资料目录、文件格式、购买账号和使用方式。结算时必须由用户主动勾选本规则确认框；确认框默认不勾选。未确认的请求不能创建微信支付订单。</p>
    <h2>三、数字内容交付后的无理由退货</h2>
    <p>数字内容具有可访问、可复制、可下载的特点。在符合适用法律规定、且用户明确知悉并确认的前提下，一旦在线考试、试卷或数字资料已经开通访问权限、提供下载或完成相应交付，不接受单纯因购买错误、改变主意、已经阅读、已经使用或下载后不再需要而提出的无理由退款申请。</p>
    <h2>四、依法保障的售后权利</h2>
    <p>若商品未能按约定交付、文件无法正常获取且未能修复、实际内容与购买说明严重不符、存在不符合质量要求的情形，或法律规定应承担退款、补救等责任，本站依法处理。上述条款不排除也不限制消费者依法享有的权利。</p>
    <h2>五、订单及交付记录</h2>
    <p>交易通过同一微信买家账号处理。订单将记录所确认的规则版本和确认时间，支付状态须由微信支付官方验签、独立查单后才能确认为已支付。正式付费商品可在 <Link href="/account">我的订单与权益</Link> 中查看。法定售后事件在核实后按规定处理，不会因为“原则上不接受无理由退款”而被系统直接拒绝。</p>
    <p>版本：{DIGITAL_SALES_POLICY_VERSION}</p>
    <p><Link href="/membership">返回考试和资料购买页</Link></p>
  </main>;
}
