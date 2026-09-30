import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const USER_DATA_DIR = process.env.SOCTHINK_USER_DATA_DIR?.trim()
  ? path.resolve(process.env.SOCTHINK_USER_DATA_DIR.trim())
  : path.join(process.cwd(), "private", "users");

export function userDataPath(name: string) {
  return path.join(USER_DATA_DIR, name);
}

export function ensureUserDataDir() {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

export function readJsonArray<T>(file: string): T[] {
  ensureUserDataDir();
  if (!fs.existsSync(file)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

export function atomicWriteJson(file: string, value: unknown) {
  ensureUserDataDir();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

export function readOrCreateSecret(file: string, bytes = 48) {
  ensureUserDataDir();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(bytes).toString("hex"), { mode: 0o600 });
  }
  return fs.readFileSync(file, "utf8").trim();
}
