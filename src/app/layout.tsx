import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import {marketplaceMode} from "@/lib/marketplace-entitlement";
import { SITE_BRAND } from "@/lib/site-brand";
import "./globals.css";
import "./direct-entry.css";
export function generateMetadata():Metadata{return marketplaceMode()?{title:"SOC THINK · AMC 8 数学测评",description:"已购买的 AMC 8 模拟考试与个人诊断报告",robots:{index:false,follow:false},referrer:"origin"}:{metadataBase:new URL("https://socthink.cn"),title:SITE_BRAND.title,description:SITE_BRAND.description}}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{marketplaceMode()?<header className="marketplace-head"><span className="marketplace-head-mark">S</span><span><strong>SOC THINK</strong><small>数学测评 · 个人报告</small></span></header>:<SiteHeader/>}<main>{children}</main>{!marketplaceMode()&&<SiteFooter/>}</body></html>}
