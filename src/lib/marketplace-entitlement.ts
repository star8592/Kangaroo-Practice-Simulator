import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Separate runtime only. License issues HMAC-authenticated job handoff tickets. */
export const MARKETPLACE_COOKIE = "socthink_marketplace_session";
type Ticket = { v: 1; job: string; sku: "EDU-001"; kind: "EXAM_REPORT_ONCE"; examId: string; exp: number };
type Grant = { jobHash: string; examId: string; sku: string; sessionHash: string; createdAt: number; reportUntil: number };
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const safeEquals = (a: string, b: string) => {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
export const marketplaceMode = () => process.env.SOCTHINK_MARKETPLACE_EXAM_MODE === "1";
function configuration() {
  if (!marketplaceMode()) throw Error("MARKETPLACE_MODE_DISABLED");
  const secret = process.env.SOCTHINK_MARKETPLACE_HANDOFF_SECRET || "";
  const examId = process.env.SOCTHINK_MARKETPLACE_AMC8_EXAM_ID || "";
  const data = process.env.SOCTHINK_MARKETPLACE_DATA_DIR || "";
  if (secret.length < 32 || !examId || !path.isAbsolute(data))
    throw Error("MARKETPLACE_CONFIG_INCOMPLETE");
  const userDir = process.env.SOCTHINK_USER_DATA_DIR || "";
  if (!path.isAbsolute(userDir) || path.resolve(data) === path.resolve(userDir) ||
      path.resolve(userDir).startsWith(path.resolve(data) + path.sep) ||
      path.resolve(data).startsWith(path.resolve(userDir) + path.sep))
    throw Error("MARKETPLACE_DATA_NOT_ISOLATED");
  return {secret, examId, data};
}
function grantPath(jobHash: string) {
  const {data} = configuration();
  const dir = path.join(data, "grants");
  fs.mkdirSync(dir, {recursive:true, mode:0o700});
  return path.join(dir, jobHash + ".json");
}
export function signMarketplaceTicket(payload: Ticket, secret: string) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("hex");
  return encoded + "." + signature;
}
export function verifyMarketplaceTicket(value: string): Ticket {
  const {secret, examId} = configuration();
  if (value.length > 1300 || !/^[a-zA-Z0-9_-]{20,1200}\.[a-f0-9]{64}$/.test(value))
    throw Error("INVALID_TICKET");
  const [payload, signature] = value.split(".");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!safeEquals(signature, expected)) throw Error("INVALID_TICKET_SIGNATURE");
  let ticket: Ticket;
  try { ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Ticket; }
  catch { throw Error("INVALID_TICKET"); }
  const now = Math.floor(Date.now()/1000);
  if (ticket?.v !== 1 || ticket.sku !== "EDU-001" || ticket.kind !== "EXAM_REPORT_ONCE" ||
      ticket.examId !== examId || typeof ticket.job !== "string" ||
      !/^[a-zA-Z0-9_-]{8,128}$/.test(ticket.job) ||
      !Number.isInteger(ticket.exp) || ticket.exp < now || ticket.exp > now + 14*86400)
    throw Error("INVALID_OR_EXPIRED_TICKET");
  return ticket;
}
function readGrant(jobHash: string): Grant | null {
  try {
    const p = grantPath(jobHash);
    const revokedFile = path.join(path.dirname(path.dirname(p)), "revocations", jobHash+".json");
    // Tombstones remain authoritative across browser restarts and all reports.
    if(fs.existsSync(revokedFile)) return null;
    const g = JSON.parse(fs.readFileSync(p, "utf8")) as Grant;
    if (g.jobHash !== jobHash || !/^[a-f0-9]{64}$/.test(g.sessionHash) ||
        typeof g.reportUntil !== "number" || typeof g.examId !== "string") return null;
    return g;
  } catch(e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
function validateCookie(value: string | undefined, g: Grant) {
  if (!value || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return false;
  const [jobHash, secret] = value.split(".");
  return jobHash === g.jobHash && safeEquals(sha(secret), g.sessionHash) && g.reportUntil > Date.now();
}
/** A cancelled order must display a useful message before the buyer starts. */
export function marketplaceTicketRevoked(ticketValue: string): boolean {
  const t=verifyMarketplaceTicket(ticketValue);
  const hash=sha(t.job+"|"+t.sku+"|"+t.examId);
  const {data}=configuration();
  return fs.existsSync(path.join(data,"revocations",hash+".json"));
}

export function redeemMarketplaceTicket(ticketValue: string, oldCookie?: string) {
  const t = verifyMarketplaceTicket(ticketValue);
  const jobHash = sha(t.job + "|" + t.sku + "|" + t.examId);
  const current = readGrant(jobHash);
  if (current) {
    if (current.examId !== t.examId || !validateCookie(oldCookie, current)) throw Error("ALREADY_CLAIMED");
    return {cookie: oldCookie!, examId: t.examId, resumed:true};
  }
  const random = crypto.randomBytes(32).toString("hex");
  const record: Grant = {jobHash, examId:t.examId,sku:t.sku,sessionHash:sha(random),createdAt:Date.now(),reportUntil:Date.now()+30*86400_000};
  const file = grantPath(jobHash);
  // Exclusive create: only one first claimant, even with concurrent browser tabs.
  let fd: number;
  try { fd = fs.openSync(file,"wx",0o600); }
  catch (e) { if ((e as NodeJS.ErrnoException).code==="EEXIST") throw new Error("ALREADY_CLAIMED",{cause:e}); throw e; }
  try { fs.writeFileSync(fd,JSON.stringify(record)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  return {cookie: jobHash + "." + random,examId:t.examId,resumed:false};
}
export function marketplaceUserFromCookie(value:string|undefined) {
  if (!marketplaceMode() || !value || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value)) return null;
  const [jobHash] = value.split(".");
  const g = readGrant(jobHash);
  if (!g || !validateCookie(value,g)) return null;
  return {id:"market_" + jobHash,username:"marketplace",candidateNo:"MARKET",
    name:"我的数学测评",grade:8,avatarKey:undefined,onboardingCompleted:true,createdAt:g.createdAt,
    active:true,role:"student" as const,sessionVersion:1};
}
export function marketplaceAuthorizedExam(userId: string, examId: string) {
  if (!marketplaceMode()) return true;
  const matched = /^market_([a-f0-9]{64})$/.exec(userId);
  if (!matched) return false;
  const g = readGrant(matched[1]);
  return !!g && g.examId === examId && g.reportUntil > Date.now();
}
