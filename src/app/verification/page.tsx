import Link from "next/link";
import { verifiedMathCount, verifiedMathItems } from "@/lib/math-verification";

const methodName=(method:string)=>method==="lean"?"Lean 形式验证":method==="symbolic"?"符号验证":method==="deterministic"?"确定性校验":"专家复核";
const short=(x?:string|null,n=12)=>x?`${x.slice(0,n)}…`:"—";
export default function VerificationPage(){
  const items=verifiedMathItems().sort((a,b)=>a.problemId.localeCompare(b.problemId));
  return <div className="verification-shell">
    <section className="verification-hero"><span className="eyebrow">VERIFIED MATHEMATICS</span><h1>数学验证中心</h1>
      <p>AI 负责讲题，验证器负责阻止未经证明的数学结论被标成“已验证”。当前正式收录 <strong>{verifiedMathCount}</strong> 道通过固定版本 Lean + Mathlib 的竞赛题。</p>
      <div className="verification-principle"><strong>Formally Verified ≠ AI 自评正确</strong><span>只有保存的形式化命题在固定工具链上重新运行通过，才显示该标识。</span></div>
    </section>
    <section className="verification-levels"><article><b>✓</b><strong>Checked</strong><span>确定性数值校验</span></article><article><b>∑</b><strong>Symbolically Verified</strong><span>代数 / CAS 校验</span></article><article className="active"><b>λ</b><strong>Formally Verified</strong><span>Lean + Mathlib</span></article><article><b>◎</b><strong>Expert Reviewed</strong><span>人工专家复核</span></article></section>
    <section className="verification-method"><h2>我们验证什么</h2><p>验证对象是数学命题本身，而不是页面文案。每条记录绑定证明源文件指纹、Lean 工具链、Mathlib revision、验证器代码 revision 和时间戳。证明源码一旦变化，指纹随之变化，旧验证记录不能继续冒充当前证明。</p></section>
    <section className="verification-table-wrap"><div className="section-heading"><div><span className="eyebrow">AUDIT LOG</span><h2>形式验证记录</h2></div><Link href="/" className="secondary-button">返回题库</Link></div>
      <div className="verification-table"><div className="verification-row head"><span>题目</span><span>方法</span><span>领域</span><span>Lean</span><span>Mathlib</span><span>证明指纹</span></div>
      {items.map(({problemId,verification})=><div className="verification-row" key={problemId}><span><strong>{problemId}</strong><small>{verification.competition} · {verification.year}</small></span><span>{methodName(verification.method)}</span><span>{verification.domain||"—"}</span><span>{verification.leanToolchain?.replace("leanprover/lean4:","")||"—"}</span><span title={verification.mathlibRevision||""}>{short(verification.mathlibRevision)}</span><span title={verification.sourceSha256||""}>{short(verification.sourceSha256)}</span></div>)}</div>
    </section>
  </div>;
}
