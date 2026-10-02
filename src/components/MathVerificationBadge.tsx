import Link from "next/link";
import type { MathVerification } from "@/lib/types";

export default function MathVerificationBadge({verification,lang="zh"}:{verification?:MathVerification;lang?:"zh"|"en"}){
  if(!verification||verification.status!=="verified") return null;
  const formal=verification.method==="lean";
  const label=formal?(lang==="zh"?"Lean 形式验证":"Formally Verified"):(lang==="zh"?"已验证":"Verified");
  const title=formal?(lang==="zh"?"该数学结论已通过固定版本 Lean + Mathlib 验证":"This mathematical claim passed the pinned Lean + Mathlib verifier"):label;
  return <Link className={`math-verification-badge ${formal?"formal":""}`} href="/verification" title={title}>
    <span aria-hidden="true">✓</span><strong>{label}</strong>
  </Link>;
}
