/**
 * Read-only Wuhan Xiaoshengchu provenance directory.
 * This is explicitly NOT the authenticated question bank, exam runtime or
 * a guarantee that any referenced PDF can be lawfully redistributed.
 */
import source01 from "../../docs/data-staging/xiaoshengchu/wuhan-2026/sources-01.json";
import source02 from "../../docs/data-staging/xiaoshengchu/wuhan-2026/sources-02.json";
import source03 from "../../docs/data-staging/xiaoshengchu/wuhan-2026/sources-03.json";
import source04 from "../../docs/data-staging/xiaoshengchu/wuhan-2026/sources-04.json";
import source05 from "../../docs/data-staging/xiaoshengchu/wuhan-2026/sources-05.json";
import evidence from "../../docs/data-staging/xiaoshengchu/wuhan-2026/claims.json";

type StagedSource = (typeof source01.items)[number];
type StagedClaim = (typeof evidence.items)[number];

export type XiaoshengchuKind = "回忆题" | "预测模拟" | "考试及资料目录" | "活动与资讯";
export type XiaoshengchuSource = {
  id: string;
  title: string;
  school: string;
  year: string;
  subject: string;
  provider: string;
  publishedAt: string | null;
  url: string;
  kind: XiaoshengchuKind;
  access: string;
  authenticity: "未核实";
  rights: "未核实";
  fullPaperObtained: false;
  publishable: false;
};
export type XiaoshengchuSchoolEvidence = {
  school: string;
  cohort: string;
  kind: string;
  description: string;
  date: string;
  access: string;
  sourceUrl: string;
  publishable: false;
};
export type XiaoshengchuFilters = {
  q?: string;
  year?: string;
  school?: string;
  subject?: string;
  kind?: string;
  page?: number;
};
const rawSources: StagedSource[] = [
  ...source01.items, ...source02.items, ...source03.items,
  ...source04.items, ...source05.items,
];
const rawClaims: StagedClaim[] = evidence.items;

const schoolAliases: readonly [string, string][] = [
  ["光谷未来", "武汉光谷未来学校"], ["光谷为明", "光谷为明学校"],
  ["东湖外国语", "武汉东湖外国语学校"], ["华一光谷", "华一光谷学校"],
  ["华宜寄", "华宜寄宿学校"], ["华一寄", "华宜寄宿学校"],
  ["武钢实验", "武钢实验学校"], ["钢实", "武钢实验学校"],
  ["二中广雅", "武汉二中广雅中学"], ["七一华源", "武汉七一华源中学"],
  ["美加外校", "武汉美加外校"], ["华美实验", "武汉华美实验学校"],
  ["点睛", "武汉点睛学校"], ["经开外校", "武汉经开外国语学校"],
  ["华师一附", "华师一附"], ["丘成桐", "华师一附"],
  ["武汉外初", "武汉外国语学校初中部"], ["武汉外校", "武汉外国语学校初中部"],
  ["武汉三寄", "武汉三寄宿学校"], ["杨春湖", "杨春湖实验学校"],
];

/** Prefer the explicit source school when it unambiguously names one school. */
export function canonicalXiaoshengchuSchool(hint: string, title = ""): string {
  const explicit = hint.trim();
  const generic = /^(?:其他|未标注|多校|综合|待归属|未知|未判定)/.test(explicit);
  const primary = generic ? title : explicit;
  const matches = [...new Set(schoolAliases
    .filter(([alias]) => primary.includes(alias)).map(([,canonical])=>canonical))];
  if (matches.length === 1) return matches[0];
  // A multi-school article does not belong to one school, even when both
  // school names are present in its title or in a metadata hint.
  if (matches.length > 1 || generic || !primary) return "综合资料／学校待核";
  return explicit;
}

export function classifyXiaoshengchuSource(source: Pick<StagedSource, "title" | "recordType">): XiaoshengchuKind {
  const text = source.title + " " + source.recordType;
  if (/预测|模拟/.test(text)) return "预测模拟";
  if (/回忆/.test(text)) return "回忆题";
  if (/活动|招生|开放日|游园动态|讲座|账号主页|时间线|规划|新闻/.test(text) &&
      !/试卷|试题|题目|答案|解析/.test(text)) return "活动与资讯";
  return "考试及资料目录";
}
function safeWebUrl(value: string): boolean {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}
function safeSource(source: StagedSource): boolean {
  return source.publishable === false && source.fullExamObtained === false &&
    source.rightsStatus === "unverified" && source.authenticityStatus === "unverified" &&
    source.publicationStatus === "staging_only" && safeWebUrl(source.sourceUrl);
}
function searchableText(item: XiaoshengchuSource): string {
  return [item.title, item.school, item.year, item.provider, item.subject].join(" ").toLocaleLowerCase("zh-CN");
}
function matchesYear(item: XiaoshengchuSource, year: string): boolean {
  if (!year) return true;
  if (year === "2026") return item.year === "2026" || item.year === "2026届";
  return item.year === year;
}

export const XIAOSHENGCHU_SOURCE_DIRECTORY: readonly XiaoshengchuSource[] = rawSources
  .filter(safeSource)
  .map((source) => ({
    id: source.sourceId,
    title: source.title,
    school: canonicalXiaoshengchuSchool(source.schoolHint, source.title),
    year: source.examYearLabel,
    subject: source.subjectHint,
    provider: source.provider,
    publishedAt: source.publishedAt,
    url: source.sourceUrl,
    kind: classifyXiaoshengchuSource(source),
    access: source.access,
    authenticity: "未核实" as const,
    rights: "未核实" as const,
    fullPaperObtained: false as const,
    publishable: false as const,
  }));

export const XIAOSHENGCHU_SCHOOL_EVIDENCE: readonly XiaoshengchuSchoolEvidence[] = rawClaims
  .filter(item => item.publishable === false && safeWebUrl(item.sourceUrl))
  .map(item => ({
    school: canonicalXiaoshengchuSchool(item.school),
    cohort: item.cohortLabel,
    kind: item.evidenceKind,
    description: item.description,
    date: item.eventDateLabel,
    access: item.access,
    sourceUrl: item.sourceUrl,
    publishable: false as const,
  }));

export function listXiaoshengchuSourceYears(): string[] {
  const years = new Set(XIAOSHENGCHU_SOURCE_DIRECTORY.map(x => x.year).filter(x => /^20\d\d(?:届)?$/.test(x)));
  years.delete("2026届"); // One user-facing filter covers 2026 and 2026届.
  return [...years].sort((a, b) => Number(b) - Number(a));
}
export function listXiaoshengchuSchools(): string[] {
  return [...new Set([...XIAOSHENGCHU_SOURCE_DIRECTORY.map(x=>x.school),
    ...XIAOSHENGCHU_SCHOOL_EVIDENCE.map(x=>x.school)])]
    .filter(x => x !== "综合资料／学校待核")
    .sort((a,b)=>a.localeCompare(b,"zh-CN"));
}
export function queryXiaoshengchuDirectory(filters: XiaoshengchuFilters = {}) {
  const q = (filters.q ?? "").trim().slice(0,100).toLocaleLowerCase("zh-CN");
  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 1) > 0 ?
    Math.min(filters.page!, 9999) : 1;
  const pageSize = 20;
  const matches = XIAOSHENGCHU_SOURCE_DIRECTORY.filter(item =>
    (!q || searchableText(item).includes(q)) &&
    matchesYear(item, filters.year ?? "") &&
    (!filters.school || item.school === filters.school) &&
    (!filters.subject || item.subject === filters.subject) &&
    (!filters.kind || item.kind === filters.kind)
  ).sort((a,b) => b.year.localeCompare(a.year) ||
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") ||
    a.id.localeCompare(b.id));
  const totalPages = Math.max(1, Math.ceil(matches.length/pageSize));
  const safePage = Math.min(page,totalPages);
  return { rows: matches.slice((safePage-1)*pageSize,safePage*pageSize),
    total: matches.length, page: safePage, totalPages, pageSize };
}

export function queryXiaoshengchuSchoolEvidence(q = "", school = "") {
  const search = q.trim().slice(0,100).toLocaleLowerCase("zh-CN");
  return XIAOSHENGCHU_SCHOOL_EVIDENCE.filter(x =>
    (!school || x.school === school) &&
    (!search || [x.school,x.description,x.kind,x.cohort].join(" ").toLocaleLowerCase("zh-CN").includes(search))
  ).slice(0,20);
}
