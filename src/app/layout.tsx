import type { Metadata } from "next";
import Link from "next/link";
import SessionNav from "@/components/SessionNav";
import { SITE_BRAND } from "@/lib/site-brand";
import "./globals.css";
export const metadata:Metadata={title:SITE_BRAND.title,description:SITE_BRAND.description};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><header className="site-header"><Link href="/" className="brand"><span className="brand-mark">{SITE_BRAND.mark}</span><span>{SITE_BRAND.nameZh}</span></Link><nav><Link href="/arithmetic">口算训练</Link><Link href="/">模拟考试</Link><Link href="/review">错题复盘</Link><SessionNav/></nav></header><main>{children}</main><footer className="site-footer"><p>© 2026 青梧未来（武汉）人工智能应用软件有限公司 | 版权所有</p><p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></p><p>本平台为独立开发的数学学习辅助工具，不代表任何国际数学竞赛官方机构。</p></footer></body></html>}
