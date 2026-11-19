import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

const base = "https://socthink.cn/marketplace/claim";

const incoming = new NextRequest(
  base + "?ticket=SYNTHETIC_SECRET_MUST_NOT_ECHO&paymentStatus=paid",
);
const stripped = proxy(incoming);
assert.equal(stripped.status, 303);
assert.equal(stripped.headers.get("location"), base);
assert.equal(stripped.headers.get("cache-control"), "private, no-store");
assert.equal(stripped.headers.get("referrer-policy"), "no-referrer");
assert.ok(!JSON.stringify([...stripped.headers]).includes("SYNTHETIC_SECRET_MUST_NOT_ECHO"));

const otherQuery = proxy(new NextRequest(base + "?source=buyer-order"));
assert.equal(otherQuery.status, 303);
assert.equal(otherQuery.headers.get("location"), base);

const plain = proxy(new NextRequest(base));
assert.equal(plain.status, 200);
assert.equal(plain.headers.get("cache-control"), "private, no-store");
assert.equal(plain.headers.get("referrer-policy"), "no-referrer");

console.log("MARKETPLACE_CLAIM_QUERY_GUARD=PASS clean_303 no_referrer no_cache no_token_response");
