/**
 * One-time owner binding for the existing SOC THINK admin/WeChat identities.
 * A verified legacy admin session + a verified WeChat session + email OTP are
 * required to create it. No email/domain automatically grants authorization.
 */
import fs from "node:fs";
import { ensureUserDataDir, userDataPath } from "./user-data-store";
import type { PublicParent } from "./parent-auth";

export type SiteOwner = {
  version: 1;
  parentId: string;
  contactEmail: string;
  emailVerifiedAt: number | null;
  boundAt: number;
  grantedByAdminId: string;
};
const FILE = userDataPath("site-owner-binding.json");

export function hasSiteOwnerBinding(): boolean {
  // A malformed existing file also blocks further bootstrap: fail closed.
  return fs.existsSync(FILE);
}

export function readSiteOwner(): SiteOwner | null {
  try {
    const row: unknown = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (!row || typeof row !== "object") return null;
    const v = row as Partial<SiteOwner>;
    if (v.version !== 1 || !/^par_[0-9a-f]{16,48}$/.test(v.parentId || "")
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail || "")
      || !v.grantedByAdminId || !Number.isFinite(v.boundAt)) return null;
    return v as SiteOwner;
  } catch {
    return null;
  }
}

export function isSiteOwner(parent: PublicParent | null | undefined): boolean {
  if (!parent?.active || !(parent.wechatId || parent.wechatOpenId)) return false;
  return readSiteOwner()?.parentId === parent.id;
}

export function bindSiteOwner(input: {
  parent: PublicParent; email: string; adminId: string; verifiedAt?: number | null;
}): SiteOwner {
  if (!input.parent.active || !(input.parent.wechatId || input.parent.wechatOpenId)
    || !/^par_[0-9a-f]{16,48}$/.test(input.parent.id)) {
    throw new Error("必须使用已登录的主站微信账号");
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !input.adminId) {
    throw new Error("网站所有者邮箱或授权凭据无效");
  }
  ensureUserDataDir();
  const row: SiteOwner = {
    version: 1, parentId: input.parent.id, contactEmail: email,
    emailVerifiedAt: input.verifiedAt ?? null,
    boundAt: Date.now(), grantedByAdminId: input.adminId,
  };
  // O_EXCL prevents concurrent/bootstrap overwrite; root permission stays 0600.
  const fd = fs.openSync(FILE, "wx", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(row, null, 2));
  } finally {
    fs.closeSync(fd);
  }
  return row;
}

export function verifySiteOwnerEmail(parent: PublicParent, email: string): boolean {
  if (!isSiteOwner(parent)) return false;
  const original = readSiteOwner();
  if (!original || original.contactEmail !== email.trim().toLowerCase()) return false;
  if (original.emailVerifiedAt) return true;
  const revised: SiteOwner = { ...original, emailVerifiedAt: Date.now() };
  const replacement = FILE + ".verified-" + process.pid;
  const fd = fs.openSync(replacement, "wx", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(revised, null, 2));
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(replacement, FILE);
  return true;
}
