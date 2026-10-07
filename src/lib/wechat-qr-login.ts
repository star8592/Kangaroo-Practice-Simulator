import crypto from "node:crypto";
import { atomicWriteJson, readJsonArray, readOrCreateSecret, userDataPath } from "./user-data-store";

type WechatQrLoginRow = {
  ticketHash: string;
  stateHash: string;
  status: "pending" | "authenticated";
  parentId?: string;
  createdAt: number;
  expiresAt: number;
};

export type WechatQrPollResult =
  | { status: "pending"; expiresAt: number }
  | { status: "authenticated"; parentId: string; expiresAt: number }
  | { status: "expired" };

const FILE = userDataPath("wechat-qr-login.json");
const SECRET = userDataPath("wechat-qr-login-secret.txt");
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function secret() {
  return readOrCreateSecret(SECRET);
}

function digest(kind: "ticket" | "state", value: string) {
  return crypto.createHmac("sha256", secret()).update(`${kind}|${value}`).digest("hex");
}

function load(now = Date.now()) {
  return readJsonArray<WechatQrLoginRow>(FILE).filter((row) => row.expiresAt > now);
}

function save(rows: WechatQrLoginRow[]) {
  atomicWriteJson(FILE, rows);
}

export function issueWechatQrLogin(now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  const ticket = "wqt_" + crypto.randomBytes(24).toString("hex");
  const state = "wqs_" + crypto.randomBytes(24).toString("hex");
  const rows = load(now);
  const row: WechatQrLoginRow = {
    ticketHash: digest("ticket", ticket),
    stateHash: digest("state", state),
    status: "pending",
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  rows.push(row);
  save(rows);
  return { ticket, state, expiresAt: row.expiresAt };
}

export function pendingWechatQrState(state: string, now = Date.now()) {
  if (!/^wqs_[0-9a-f]{48}$/.test(state)) return false;
  const rows = load(now);
  const stateHash = digest("state", state);
  return rows.some((item) => item.stateHash === stateHash && item.status === "pending");
}

export function completeWechatQrLogin(state: string, parentId: string, now = Date.now()) {
  const rows = load(now);
  const stateHash = digest("state", state);
  const row = rows.find((item) => item.stateHash === stateHash);
  if (!row || row.status !== "pending" || !parentId) return false;
  row.status = "authenticated";
  row.parentId = parentId;
  save(rows);
  return true;
}

export function pollWechatQrLogin(ticket: string, now = Date.now()): WechatQrPollResult {
  const all = readJsonArray<WechatQrLoginRow>(FILE);
  const ticketHash = digest("ticket", ticket);
  const row = all.find((item) => item.ticketHash === ticketHash);
  if (!row || row.expiresAt <= now) {
    const kept = all.filter((item) => item.expiresAt > now && item.ticketHash !== ticketHash);
    if (kept.length !== all.length) save(kept);
    return { status: "expired" };
  }
  if (row.status !== "authenticated" || !row.parentId) {
    return { status: "pending", expiresAt: row.expiresAt };
  }
  return { status: "authenticated", parentId: row.parentId, expiresAt: row.expiresAt };
}

export function consumeWechatQrLogin(ticket: string, now = Date.now()) {
  const rows = readJsonArray<WechatQrLoginRow>(FILE);
  const ticketHash = digest("ticket", ticket);
  const row = rows.find((item) => item.ticketHash === ticketHash);
  if (!row || row.expiresAt <= now || row.status !== "authenticated" || !row.parentId) {
    return null;
  }
  save(rows.filter((item) => item.ticketHash !== ticketHash && item.expiresAt > now));
  return { parentId: row.parentId };
}
