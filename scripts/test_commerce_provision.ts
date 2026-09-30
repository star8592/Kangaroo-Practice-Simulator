import fs from "node:fs";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/internal/commerce/students/route";

function req(body: unknown, token?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new NextRequest("http://localhost/api/internal/commerce/students", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main() {
  const token = process.env.COMMERCEFLOW_PROVISION_TOKEN || "";
  const dataDir = process.env.SOCTHINK_USER_DATA_DIR || "";
  if (!token || !dataDir) throw new Error("test requires COMMERCEFLOW_PROVISION_TOKEN and SOCTHINK_USER_DATA_DIR");

  const base = { externalRef: "order-test-001", name: "测试学生", grade: 6, school: "Test School", pin: "482731" };

  const unauthorized = await json(await POST(req(base)));
  if (unauthorized.status !== 401) throw new Error(`expected 401, got ${unauthorized.status}`);

  const created = await json(await POST(req(base, token)));
  if (created.status !== 201 || created.body.created !== true) throw new Error(`create failed: ${JSON.stringify(created)}`);

  const repeated = await json(await POST(req(base, token)));
  if (repeated.status !== 200 || repeated.body.idempotent !== true || repeated.body.created !== false) {
    throw new Error(`idempotency failed: ${JSON.stringify(repeated)}`);
  }

  const conflict = await json(await POST(req({ ...base, name: "另一个学生" }, token)));
  if (conflict.status !== 409) throw new Error(`expected 409, got ${JSON.stringify(conflict)}`);

  const usersPath = `${dataDir}/users.json`;
  const users = JSON.parse(fs.readFileSync(usersPath, "utf8")) as Array<Record<string, unknown>>;
  if (users.length !== 1) throw new Error(`expected exactly one test user, got ${users.length}`);
  if ("pin" in users[0] || !String(users[0].pinHash || "").startsWith("scrypt$")) {
    throw new Error("PIN storage is not hashed as expected");
  }

  console.log(JSON.stringify({
    unauthorized: unauthorized.status,
    created: created.status,
    idempotent: repeated.status,
    conflict: conflict.status,
    users: users.length,
    candidateNo: (created.body.user as Record<string, unknown>)?.candidateNo,
    testDataDir: dataDir,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
