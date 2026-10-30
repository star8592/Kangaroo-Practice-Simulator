import fs from "node:fs";
import path from "node:path";
import { userDataPath } from "./user-data-store";

export const CASE_STATES = ["open","investigating","resolved","verified","closed","dismissed"] as const;
export type CaseStatus = typeof CASE_STATES[number];
export type CaseEvent = {
  schemaVersion: 1;
  feedbackId: string;
  version: number;
  from: CaseStatus;
  to: CaseStatus;
  note: string;
  evidenceRef?: string;
  reviewerId: string;
  createdAt: string;
};
export type CaseState = {
  status: CaseStatus;
  version: number;
  lastNote?: string;
  evidenceRef?: string;
  updatedAt?: string;
};
export class CaseTransitionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const STATUS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  open: ["investigating"],
  investigating: ["resolved", "dismissed"],
  resolved: ["verified", "investigating"],
  verified: ["closed", "investigating"],
  closed: ["investigating"],
  dismissed: ["investigating"],
};
const ID = /^[0-9a-f]{32}$/;
const NAME = /^[0-9a-f]{32}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATEFILE = /^[0-9a-f]{32}\.json$/;
const mask = (s: string) => s
  .replace(/\b1[3-9]\d{9}\b/g, "[手机号已隐藏]")
  .replace(/\b\d{17}[\dXx]\b/g, "[证件号码已隐藏]")
  .replace(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, "[电子邮箱已隐藏]");

export function legalNextStates(status: CaseStatus): readonly CaseStatus[] {
  return STATUS[status];
}
function rootPaths(root?: string) {
  const directory = root ?? userDataPath("");
  return {
    source: path.join(directory, "customer-feedback"),
    events: path.join(directory, "customer-feedback-case-events.jsonl"),
    lock: path.join(directory, "customer-feedback-case-events.lock"),
  };
}
export function feedbackExists(feedbackId: string, root?: string): boolean {
  if (!ID.test(feedbackId)) return false;
  const base = rootPaths(root).source;
  if (!fs.existsSync(base)) return false;
  for (const hash of fs.readdirSync(base).filter(x => NAME.test(x))) {
    const u = path.join(base, hash);
    const us = fs.lstatSync(u);
    if (!us.isDirectory() || us.isSymbolicLink()) continue;
    for (const day of fs.readdirSync(u).filter(x => DAY.test(x))) {
      const folder = path.join(u, day);
      const ds = fs.lstatSync(folder);
      if (!ds.isDirectory() || ds.isSymbolicLink()) continue;
      const file = feedbackId+".json";
      if (!DATEFILE.test(file)) continue;
      const full = path.join(folder,file);
      try {
        const st = fs.lstatSync(full);
        if (!st.isFile() || st.isSymbolicLink() || st.size > 4096) continue;
        const data = JSON.parse(fs.readFileSync(full,"utf8")) as {id?:string;schemaVersion?:number};
        if (data.id===feedbackId && data.schemaVersion===1) return true;
      } catch { /* no match */ }
    }
  }
  return false;
}
export function readCaseStates(root?: string): Map<string,CaseState> {
  const {events} = rootPaths(root);
  const state = new Map<string,CaseState>();
  if (!fs.existsSync(events)) return state;
  const stat = fs.lstatSync(events);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 12_000_000) {
    throw new CaseTransitionError(503,"反馈处理日志不可安全读取");
  }
  const text = fs.readFileSync(events,"utf8");
  if (text && !text.endsWith("\n")) throw new CaseTransitionError(503,"反馈处理日志最后一笔不完整");
  for(const line of text.split("\n")) {
    if (!line) continue;
    let event:CaseEvent;
    try { event=JSON.parse(line) as CaseEvent; }
    catch { throw new CaseTransitionError(503,"反馈处理日志包含损坏记录"); }
    if(event.schemaVersion!==1 || !ID.test(event.feedbackId) ||
       !Number.isSafeInteger(event.version) || event.version < 1 ||
       !CASE_STATES.includes(event.to) || !CASE_STATES.includes(event.from) ||
       !legalNextStates(event.from).includes(event.to) ||
       typeof event.reviewerId!=="string" || !event.reviewerId.startsWith("adm_") ||
       typeof event.note!=="string" || event.note.length > 500 ||
       typeof event.createdAt!=="string" || !Number.isFinite(Date.parse(event.createdAt))) {
      throw new CaseTransitionError(503,"反馈处理日志校验失败");
    }
    const old = state.get(event.feedbackId) ?? {status:"open",version:0};
    if (event.from !== old.status || event.version !== old.version+1) {
      throw new CaseTransitionError(503,"反馈处理日志状态链损坏");
    }
    state.set(event.feedbackId,{status:event.to,version:event.version,
      lastNote:mask(event.note),...(event.evidenceRef?{evidenceRef:event.evidenceRef}:{}),
      updatedAt:event.createdAt});
  }
  return state;
}
export function updateFeedbackCase(input: {
  feedbackId: string;
  expectedVersion: number;
  to: CaseStatus;
  note: string;
  evidenceRef?: string;
  reviewerId: string;
}, options:{root?:string;now?:Date}={}): CaseState {
  if (!ID.test(input.feedbackId) || !CASE_STATES.includes(input.to) ||
      typeof input.reviewerId!=="string" || !/^adm_[0-9a-f]{16}$/.test(input.reviewerId) ||
      !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<0 ||
      typeof input.note!=="string" || input.note.trim().length<8 ||
      input.note.length>500 || /[\r\n]/.test(input.note)) {
    throw new CaseTransitionError(400,"无效的反馈处理操作");
  }
  const evidenceRef=(input.evidenceRef ?? "").trim();
  if (evidenceRef && (!/^[A-Za-z0-9_.:/@#-]{8,240}$/.test(evidenceRef) ||
      evidenceRef.includes(".."))) throw new CaseTransitionError(400,"证据引用格式无效");
  if (["resolved","verified","closed","dismissed"].includes(input.to) && !evidenceRef) {
    throw new CaseTransitionError(400,"此处理阶段需要填写可核实的证据引用");
  }
  const {events,lock}=rootPaths(options.root);
  fs.mkdirSync(path.dirname(events),{recursive:true,mode:0o700});
  let lockFd: number;
  try{lockFd=fs.openSync(lock,"wx",0o600)}
  catch{throw new CaseTransitionError(409,"另一名管理员正在处理，请稍后重试")}
  try{
    if(!feedbackExists(input.feedbackId,options.root)) throw new CaseTransitionError(404,"未找到对应的真实考试反馈");
    const states=readCaseStates(options.root);
    const previous=states.get(input.feedbackId) ?? {status:"open" as const,version:0};
    if(previous.version!==input.expectedVersion) throw new CaseTransitionError(409,"该反馈已更新，请刷新后再操作");
    if(!legalNextStates(previous.status).includes(input.to)) {
      throw new CaseTransitionError(409,"不符合反馈处理顺序");
    }
    const event:CaseEvent={
      schemaVersion:1,feedbackId:input.feedbackId,version:previous.version+1,
      from:previous.status,to:input.to,note:input.note.trim(),
      ...(evidenceRef?{evidenceRef}:{}),
      reviewerId:input.reviewerId,createdAt:(options.now??new Date()).toISOString(),
    };
    const fd=fs.openSync(events,fs.constants.O_CREAT|fs.constants.O_APPEND|fs.constants.O_WRONLY,0o600);
    try{fs.writeSync(fd,JSON.stringify(event)+"\n");fs.fsyncSync(fd)}
    finally{fs.closeSync(fd)}
    return {status:event.to,version:event.version,lastNote:mask(event.note),
      ...(evidenceRef?{evidenceRef}:{}),updatedAt:event.createdAt};
  } finally {
    fs.closeSync(lockFd);
    try{fs.unlinkSync(lock)}catch{/* administrator must resolve stale lock */}
  }
}
