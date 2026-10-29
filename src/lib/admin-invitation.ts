import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createAdmin, loadUsers } from "./auth";
import { ensureUserDataDir, userDataPath } from "./user-data-store";

type Invitation = {
  version: 1;
  email: string;
  digest: string;
  issuedAt: number;
  expiresAt: number;
};

const INVITATION_FILE = "pending-admin-invitation.json";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class AdminInvitationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function digest(token: string): Buffer {
  return crypto.createHash("sha256").update(token, "utf8").digest();
}

function invitationPath(root?: string): string {
  return root ? path.join(root, INVITATION_FILE) : userDataPath(INVITATION_FILE);
}

function readInvitation(file: string): Invitation | null {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2048) return null;
    const x = JSON.parse(fs.readFileSync(file, "utf8")) as Invitation;
    if (x.version !== 1 || typeof x.email !== "string" || !EMAIL.test(x.email) ||
        typeof x.digest !== "string" || !/^[0-9a-f]{64}$/.test(x.digest) ||
        !Number.isSafeInteger(x.expiresAt) || !Number.isSafeInteger(x.issuedAt)) return null;
    return x;
  } catch { return null; }
}

/** CLI-only operation. No public route can issue or renew admin invitations. */
export function issueAdminInvitation(email: string, options: { root?: string; now?: number; ttlMs?: number } = {}) {
  const target = email.trim().toLowerCase();
  if (!EMAIL.test(target) || target.length > 120) throw new Error("Invalid admin invite recipient");
  if (loadUsers().some(x => x.username.toLowerCase() === target)) throw new Error("Account already exists");
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
  if (ttlMs <= 0 || ttlMs > 48 * 60 * 60 * 1000) throw new Error("Invalid invitation duration");
  if (!options.root) ensureUserDataDir();
  else fs.mkdirSync(options.root, { recursive: true, mode: 0o700 });
  const file = invitationPath(options.root);
  const existing = readInvitation(file);
  if (existing && existing.expiresAt > now) throw new Error("A valid invitation already exists");
  const token = crypto.randomBytes(32).toString("hex");
  const record: Invitation = {
    version: 1, email: target, digest: digest(token).toString("hex"),
    issuedAt: now, expiresAt: now + ttlMs,
  };
  // Never create a world-readable temporary secret file, even momentarily.
  const temp = file + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
  try {
    fs.writeFileSync(temp, JSON.stringify(record), { flag: "wx", mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    try { fs.unlinkSync(temp); } catch { /* already renamed */ }
  }
  return { token, expiresAt: record.expiresAt, recipient: target };
}

/** Email possession is proven by the one-time invite token, not by an auto-filled username. */
export function activateInvitedAdmin(
  token: string, pin: string,
  options: { root?: string; now?: number } = {},
) {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new AdminInvitationError(400, "邀请无效或已过期");
  if (pin.length < 12 || pin.length > 128) throw new AdminInvitationError(400, "密码需要12至128个字符");
  const file = invitationPath(options.root);
  const lock = file + ".lock";
  let lockFd: number;
  try {
    lockFd = fs.openSync(lock, "wx", 0o600);
  } catch {
    throw new AdminInvitationError(409, "正在处理另一笔激活请求，请稍后重试");
  }
  try {
    const invite = readInvitation(file);
    const now = options.now ?? Date.now();
    if (!invite || invite.expiresAt <= now) throw new AdminInvitationError(400, "邀请无效或已过期");
    const supplied = digest(token);
    const expected = Buffer.from(invite.digest, "hex");
    if (!crypto.timingSafeEqual(supplied, expected)) throw new AdminInvitationError(400, "邀请无效或已过期");
    if (loadUsers().some(x => x.username.toLowerCase() === invite.email)) {
      throw new AdminInvitationError(409, "账号已经存在");
    }
    const admin = createAdmin({ username: invite.email, name: "SOCTHINK 管理员", pin });
    fs.unlinkSync(file);
    return admin;
  } finally {
    fs.closeSync(lockFd);
    try { fs.unlinkSync(lock); } catch { /* no-op */ }
  }
}
