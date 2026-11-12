import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function main() {
  // This test MUST NOT touch the live `private/users` directory.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-userstore-"));
  const dataDir = path.join(sandbox, "private-users");
  const prior = process.env.SOCTHINK_USER_DATA_DIR;
  process.env.SOCTHINK_USER_DATA_DIR = dataDir;
  try {
    const { atomicWriteJson, ensureUserDataDir, readJsonArray, userDataPath } =
      await import("../src/lib/user-data-store");
    ensureUserDataDir();
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(dataDir).mode & 0o777, 0o700);
    }
    const file = userDataPath("test-parents.json");
    assert.equal(file, path.join(dataDir, "test-parents.json"));
    fs.writeFileSync(file, "[]", { mode: 0o644 }); // legacy permission fixture
    atomicWriteJson(file, [{ id: "fixture-stable" }]);
    assert.deepEqual(readJsonArray(file), [{ id: "fixture-stable" }]);
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    }
    for (let i = 0; i < 5; i++) atomicWriteJson(file, [{ id: i }]);
    assert.deepEqual(readJsonArray(file), [{ id: 4 }]);
    assert.deepEqual(fs.readdirSync(dataDir), ["test-parents.json"]);
    console.log("USER_DATA_STORE_PRIVATE_ATOMIC_PERMISSIONS_PASS");
  } finally {
    if (prior === undefined) delete process.env.SOCTHINK_USER_DATA_DIR;
    else process.env.SOCTHINK_USER_DATA_DIR = prior;
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
