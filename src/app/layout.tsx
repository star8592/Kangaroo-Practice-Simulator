import type { Metadata } from "next";
import Link from "next/link";
import SessionNav from "@/components/SessionNav";
import "./globals.css";
export const metadata:Metadata={title:"Kangaroo Practice Lab",description:"Local Math Kangaroo practice and mock-exam simulator"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><header className="site-header"><Link href="/" className="brand"><span className="brand-mark">K</span><span>Kangaroo Practice Lab</span></Link><nav><Link href="/arithmetic">口算训练</Link><Link href="/">模拟考试</Link><Link href="/review">错题复盘</Link><SessionNav/></nav></header><main>{children}</main></body></html>}
