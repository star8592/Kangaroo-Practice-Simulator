import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { SITE_BRAND } from "@/lib/site-brand";
import "./globals.css";
export const metadata:Metadata={title:SITE_BRAND.title,description:SITE_BRAND.description};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><SiteHeader/><main>{children}</main><SiteFooter/></body></html>}
