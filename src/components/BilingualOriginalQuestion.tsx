import Image from "next/image";

/** A single view for original English past-paper pixels and a separate
 * Chinese translation. Never typeset or regenerate source mathematics.
 * Used only when an exam opts into zh-en-stacked presentation.
 */
export default function BilingualOriginalQuestion({
  chinese,
  english,
  originalImage,
  questionNo,
  compact = false,
}: {
  chinese: string;
  english?: string;
  originalImage?: string;
  questionNo: number;
  compact?: boolean;
}) {
  return <section className={"bilingual-original" + (compact ? " compact" : "")}
    aria-label={"第 " + questionNo + " 题中英对照"}>
    <div className="bilingual-original-translation" lang="zh-CN">
      <div className="bilingual-original-label">中文译文</div>
      <p>{chinese || "本题中文译文尚未提供，请以原英文题目为准。"}</p>
    </div>
    <div className="bilingual-original-source" lang="en">
      <div className="bilingual-original-label">Original English · 英文原卷</div>
      {originalImage
        ? <Image src={originalImage} alt={"Question " + questionNo + " original English text, options and diagrams"}
            className="bilingual-original-image" width={1050} height={700} unoptimized/>
        : <p className="bilingual-original-missing">
            原版题图缺失，无法核实完整的英文原题、公式及选项。
            {english && <span className="bilingual-original-text">{english}</span>}
          </p>}
    </div>
  </section>;
}
