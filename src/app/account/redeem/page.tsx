import {cookies} from "next/headers";
import {notFound,redirect} from "next/navigation";
import {PARENT_SESSION_COOKIE,parentFromSessionToken} from "@/lib/parent-auth";
import {voucherPreviewEnabled} from "@/lib/commerce/voucher-preview";
import RedeemForm from "./RedeemForm";
export const dynamic="force-dynamic";
export default async function RedeemPage(){
 if(!voucherPreviewEnabled())notFound();
 const user=parentFromSessionToken((await cookies()).get(PARENT_SESSION_COOKIE)?.value);
 if(!user?.active||!(user.wechatId||user.wechatOpenId))redirect("/login?next=%2Faccount%2Fredeem");
 return <main data-site-shell="content" style={{maxWidth:480,margin:"40px auto",padding:24}}>
  <p>内部测试 · 不接受真实订单</p><h1>激活学习卡</h1>
  <p>当前账号：{user.name||"微信账号"}</p>
  <p>输入卡券上的激活码，权益将绑定当前账号，无需再次付款。</p>
  <RedeemForm/>
 </main>;
}
