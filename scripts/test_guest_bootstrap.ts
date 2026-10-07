import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/auth/guest/start/route";

async function request(next: string) {
  return GET(new NextRequest(`http://internal.local/api/auth/guest/start?next=${encodeURIComponent(next)}`));
}

async function main() {
  const ok = await request("/arithmetic/discovery/1?mode=diagnostic");
  assert.equal(ok.status, 307);
  assert.equal(ok.headers.get("location"), "/arithmetic/discovery/1?mode=diagnostic");
  assert.match(ok.headers.get("set-cookie") || "", /kangaroo_session=/);
  assert.ok(!(ok.headers.get("location") || "").includes("internal.local"));

  for (const target of ["//evil.example/path", "\\\\evil.example\\path", "/ok\r\nLocation: https://evil.example"]) {
    const bad = await request(target);
    assert.equal(bad.status, 400, target);
  }
  console.log("GUEST_BOOTSTRAP_REDIRECT=PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
