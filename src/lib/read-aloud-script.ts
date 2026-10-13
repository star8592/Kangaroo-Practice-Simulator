import type { Choice } from "./types";

/** Convert common math notation into speech. Never use solutions or answer keys. */
export function speechPlainText(value: string, language: "zh" | "en" = "zh"): string {
  const chinese = language === "zh";
  return (value || "")
    .replace(/\\(?:dfrac|frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      (_, numerator: string, denominator: string) =>
        chinese ? denominator + "分之" + numerator : numerator + " over " + denominator)
    .replace(/\\times\b|×/g, chinese ? "乘以" : " times ")
    .replace(/\\div\b|÷/g, chinese ? "除以" : " divided by ")
    .replace(/\\cdot\b|·/g, chinese ? "乘以" : " times ")
    .replace(/\\pi\b|π/g, chinese ? "圆周率" : " pi ")
    .replace(/\\%|％/g, "%")
    .replace(/(\d+)\s*%/g, (_, amount: string) => chinese ? "百分之" + amount : amount + " percent")
    .replace(/\$/g, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\\(?:left|right|mathrm|text)\b/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildReadAloudText(stem: string, choices: Choice[], language: "zh" | "en"): string {
  const question = speechPlainText(stem, language);
  const labels = choices
    .filter((c) => c.key?.trim())
    .map((c) => {
      const label = speechPlainText(c.label || "", language);
      // Picture-based choices often contain only their own letter as text.
      const readable = label && label.toUpperCase().replace(/[.()（）]/g, "") !== c.key.toUpperCase()
        ? label
        : "";
      return language === "zh"
        ? "选项" + c.key + "，" + (readable || "请查看题目中的选项图片") + "。"
        : "Option " + c.key + ", " + (readable || "please look at the option image") + ".";
    });
  return [question, ...labels].filter(Boolean).join(" ");
}

export function lowerPrimaryGrade(grades: string, gradeBand?: string): boolean {
  if (gradeBand === "1-2") return true;
  const normalized = (grades || "").toLowerCase().replace(/[–—~～]/g, "-").replace(/\s+/g, " ").trim();
  return normalized === "pre-a" ||
    /^grades?\s*[12]$/.test(normalized) ||
    /^grades?\s*1\s*-\s*2$/.test(normalized) ||
    /^[12]\s*年级$/.test(normalized) ||
    /^一[、至到-]?二年级$/.test(normalized);
}
