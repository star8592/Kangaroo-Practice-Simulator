export type DisplayLang = "zh" | "en";

const CONCEPT_EN: Record<string,string> = {
  "图形":"Geometry", "计数":"Counting", "简单运算":"Basic arithmetic", "比较":"Comparison",
  "规律":"Patterns", "数学思维":"Mathematical reasoning", "规律识别":"Pattern recognition",
  "空间想象":"Spatial reasoning", "加减":"Addition & subtraction", "运算":"Arithmetic",
  "逻辑推理":"Logical reasoning", "逻辑":"Logic", "空间":"Spatial reasoning",
  "图形拼合":"Shape composition", "推理":"Reasoning",
};

export function conceptLabel(value:string, lang:DisplayLang) {
  if (value === "official_original") return lang === "zh" ? "官方原题" : "Official problem";
  return lang === "en" ? (CONCEPT_EN[value] ?? value) : value;
}
