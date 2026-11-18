import fs from "node:fs";
import path from "node:path";

export type VerifiedBotEngine = "google" | "bing" | "baidu";
export type VerifiedBotStats = Readonly<{
  verifiedRequests: number;
  verifiedPublicPage200: number;
  distinctPublicPages200: number;
  publicPageErrors: number;
  lastVerifiedAt: string | null;
  samplePublicPaths: string[];
}>;
export type VerifiedBotAudit = Readonly<{
  observedAt: string;
  windowDays: 7;
  source: "nginx_access_logs";
  method: "reverse_forward_dns";
  providers: Record<VerifiedBotEngine, VerifiedBotStats>;
}>;
export type BotAuditStatus = "ok" | "missing" | "invalid" | "unreadable";

const ENGINES: readonly VerifiedBotEngine[] = ["google", "bing", "baidu"];
const KEYS: readonly (keyof VerifiedBotStats)[] = [
  "verifiedRequests", "verifiedPublicPage200", "distinctPublicPages200",
  "publicPageErrors", "lastVerifiedAt", "samplePublicPaths",
];

function validIso(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-\d{2}-\d{2}T/.test(x) &&
    Number.isFinite(Date.parse(x));
}
function validNonneg(x: unknown): x is number {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0 && x <= 1000000;
}
function validPublicPath(x: unknown): x is string {
  return typeof x === "string" && x.length < 300 && x.startsWith("/") &&
    !/[\r\n?#]/.test(x) &&
    !/^\/(?:api|admin|student|my|account|workspace|teacher-dashboard)(?:\/|$)/.test(x);
}
export function validVerifiedBotAudit(input: unknown): input is VerifiedBotAudit {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const r = input as Record<string, unknown>;
  if (r.windowDays !== 7 || r.source !== "nginx_access_logs" ||
      r.method !== "reverse_forward_dns" || !validIso(r.observedAt) ||
      !r.providers || typeof r.providers !== "object" || Array.isArray(r.providers)) return false;
  const entries = r.providers as Record<string, unknown>;
  if (Object.keys(entries).length !== ENGINES.length ||
      Object.keys(entries).some(k=>!ENGINES.includes(k as VerifiedBotEngine))) return false;
  for (const engine of ENGINES) {
    const item = entries[engine];
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const v = item as Record<string, unknown>;
    if (Object.keys(v).some(k=>!KEYS.includes(k as keyof VerifiedBotStats)) ||
        KEYS.some(k=>!(k in v))) return false;
    if (!validNonneg(v.verifiedRequests) || !validNonneg(v.verifiedPublicPage200) ||
        !validNonneg(v.distinctPublicPages200) || !validNonneg(v.publicPageErrors) ||
        (v.verifiedPublicPage200 as number) > (v.verifiedRequests as number) ||
        (v.distinctPublicPages200 as number) > (v.verifiedPublicPage200 as number) ||
        (v.publicPageErrors as number) > (v.verifiedRequests as number)) return false;
    if (v.lastVerifiedAt !== null && !validIso(v.lastVerifiedAt)) return false;
    if (!Array.isArray(v.samplePublicPaths) || v.samplePublicPaths.length > 4 ||
        !v.samplePublicPaths.every(validPublicPath) ||
        new Set(v.samplePublicPaths).size !== v.samplePublicPaths.length) return false;
    if (v.verifiedRequests === 0 && (v.lastVerifiedAt !== null ||
        v.samplePublicPaths.length > 0)) return false;
  }
  return true;
}
export function readVerifiedBotAudit(): {status: BotAuditStatus; report: VerifiedBotAudit | null} {
  const directory = process.env.SOCTHINK_SEO_DATA_DIR?.trim();
  const file = path.join(directory ? path.resolve(directory) :
    path.join(process.cwd(), "private", "seo"), "seo-verified-bots.json");
  try {
    if (fs.statSync(file).size > 12000) return {status:"invalid",report:null};
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return validVerifiedBotAudit(parsed) ? {status:"ok",report:parsed} :
      {status:"invalid",report:null};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return {status:"missing",report:null};
    return {status:error instanceof SyntaxError ? "invalid" : "unreadable",report:null};
  }
}
