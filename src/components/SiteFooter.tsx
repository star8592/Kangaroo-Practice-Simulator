"use client";

import { useSiteLanguage } from "@/lib/site-language";

export default function SiteFooter(){
 const lang=useSiteLanguage();
 return <footer className="site-footer">
  <div className="site-footer-inner">
   <p>{lang==="zh"?"© 2026 青梧未来（武汉）人工智能应用软件有限公司 | 版权所有":"© 2026 Qingwu Future (Wuhan) AI Application Software Co., Ltd. | All rights reserved"}</p>
   <p><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">鄂ICP备2026004372号</a></p>
   <p>{lang==="zh"?"本平台为独立开发的数学学习辅助工具，不代表任何国际数学竞赛官方机构。":"This platform is an independently developed mathematics learning tool and does not represent any international mathematics competition organizer."}</p>
  </div>
 </footer>;
}
