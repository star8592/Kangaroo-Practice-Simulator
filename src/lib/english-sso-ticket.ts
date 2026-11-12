/**
 * Same-origin WeChat -> independent English app handshake.
 * Only the central SOC THINK server reads the WeChat cookie.
 * Only an authenticated per-product backend can redeem a short-lived ticket.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {readOrCreateSecret, userDataPath} from "./user-data-store";

export const ENGLISH_SSO_PRODUCTS = ["pronunciation", "vocabulary", "reading", "aelos"] as const;
export type EnglishSsoProduct = typeof ENGLISH_SSO_PRODUCTS[number];
export const ENGLISH_SSO_TTL_MS = 75_000;
const TICKET_PATTERN = /^[a-f0-9]{64}$/;
const TICKET_DIR = userDataPath("english-sso-tickets");
const SUBJECT_KEY_FILE = userDataPath("english-sso-subject-key.txt");

export function isEnglishSsoProduct(value: unknown): value is EnglishSsoProduct {
  return typeof value === "string" && (ENGLISH_SSO_PRODUCTS as readonly string[]).includes(value);
}
export function ssoBackendKey(product: EnglishSsoProduct): string | null {
  const value = process.env["SOCTHINK_ENGLISH_SSO_KEY_" + product.toUpperCase()]?.trim() || "";
  return value.length >= 32 ? value : null;
}
export function backendKeyMatches(product: EnglishSsoProduct, presented: string): boolean {
  const configured = ssoBackendKey(product);
  if (!configured || !presented || presented.length > 256) return false;
  const a = crypto.createHash("sha256").update(configured).digest();
  const b = crypto.createHash("sha256").update(presented).digest();
  return crypto.timingSafeEqual(a, b);
}
function makeDir() {
  fs.mkdirSync(TICKET_DIR, {recursive: true, mode: 0o700});
}
function ticketPath(ticket: string) {
  // Ticket bytes and parent ID are never included in the file name.
  return path.join(TICKET_DIR, crypto.createHash("sha256").update(ticket).digest("hex") + ".json");
}
type Entry = {product: EnglishSsoProduct; accountId: string; expiresAt: number};
function validEntry(value: unknown): value is Entry {
  const v = value as Entry | null;
  return Boolean(v && isEnglishSsoProduct(v.product) &&
    typeof v.accountId === "string" && /^par_[a-f0-9]{18}$/.test(v.accountId) &&
    Number.isSafeInteger(v.expiresAt));
}
function clearOld(now: number) {
  try {
    // Bounded sweep; no cron and no persistent worker to manage.
    for (const name of fs.readdirSync(TICKET_DIR).slice(0, 256)) {
      if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
      const file = path.join(TICKET_DIR, name);
      if (now - fs.statSync(file).mtimeMs > ENGLISH_SSO_TTL_MS + 60_000) {
        fs.unlinkSync(file);
      }
    }
  } catch { /* The issue/redeem path still enforces its own TTL. */ }
}
export function issueEnglishSsoTicket(product: EnglishSsoProduct, accountId: string,
  now = Date.now()): {ticket: string; expiresAt: number} {
  if (!isEnglishSsoProduct(product) || !/^par_[a-f0-9]{18}$/.test(accountId)) {
    throw new Error("invalid English SSO subject");
  }
  makeDir();
  clearOld(now);
  const ticket = crypto.randomBytes(32).toString("hex");
  const expiresAt = now + ENGLISH_SSO_TTL_MS;
  fs.writeFileSync(ticketPath(ticket), JSON.stringify({product, accountId, expiresAt} satisfies Entry),
    {flag: "wx", mode: 0o600});
  return {ticket, expiresAt};
}
export function redeemEnglishSsoTicket(product: EnglishSsoProduct, ticket: string,
  now = Date.now()): {subject: string; product: EnglishSsoProduct} | null {
  if (!isEnglishSsoProduct(product) || !TICKET_PATTERN.test(ticket)) return null;
  const file = ticketPath(ticket);
  let entry: unknown;
  try {
    entry = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { return null; }
  // A ticket cannot be consumed by a different English application.
  if (!validEntry(entry) || entry.product !== product) return null;
  if (entry.expiresAt <= now || entry.expiresAt > now + ENGLISH_SSO_TTL_MS) return null;

  // Atomic claim: only one concurrent redemption can rename the original.
  const claimed = file + ".claimed-" + crypto.randomBytes(8).toString("hex");
  try { fs.renameSync(file, claimed); }
  catch { return null; }
  try {
    // Check the claimed file again instead of trusting a pre-claim snapshot.
    const finalEntry: unknown = JSON.parse(fs.readFileSync(claimed, "utf8"));
    if (!validEntry(finalEntry) || finalEntry.product !== product ||
      finalEntry.expiresAt <= now || finalEntry.expiresAt > now + ENGLISH_SSO_TTL_MS) return null;

    // Stable, per-product pseudonymous subject. No WeChat OpenID, parent ID,
    // student profile, payment data or permanent session token is exposed.
    const subject = "soc_" + crypto.createHmac("sha256", readOrCreateSecret(SUBJECT_KEY_FILE))
      .update(product + ":" + finalEntry.accountId).digest("hex").slice(0, 40);
    return {subject, product};
  } finally {
    try { fs.unlinkSync(claimed); } catch { /* Already consumed. */ }
  }
}
