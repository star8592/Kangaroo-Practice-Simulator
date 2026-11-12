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
  // The default umask is often 022. New identity/session data directories
  // must not become searchable by unrelated operating-system accounts.
  // Existing directories require a separate owner/permission migration.
  fs.mkdirSync(USER_DATA_DIR, { recursive: true, mode: 0o700 });
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

/** Fail closed for durable identity/permission records.
 * A parse error must never silently become [] and then overwrite real users.
 */
export function readJsonArrayStrict<T>(file: string): T[] {
  ensureUserDataDir();
  if (!fs.existsSync(file)) return [];
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new Error("PRIVATE_USERSTORE_JSON_INVALID");
  }
  if (!Array.isArray(value)) throw new Error("PRIVATE_USERSTORE_EXPECTED_ARRAY");
  return value as T[];
}

export function atomicWriteJson(file: string, value: unknown) {
  ensureUserDataDir();
  // A predictable `file.tmp` could collide between app processes. A unique
  // exclusive 0600 temporary file prevents collisions and avoids briefly
  // exposing parent accounts, session state or password hashes via umask 022.
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  let staged = false;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
    staged = true;
    // Same-directory rename is atomic and preserves the temp file's 0600 mode.
    fs.renameSync(tmp, file);
  } finally {
    if (staged) {
      try {
        fs.unlinkSync(tmp);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
}

export function readOrCreateSecret(file: string, bytes = 48) {
  ensureUserDataDir();
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(bytes).toString("hex"), { mode: 0o600 });
  }
  return fs.readFileSync(file, "utf8").trim();
}
