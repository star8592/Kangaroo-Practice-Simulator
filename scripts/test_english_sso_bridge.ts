import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {NextRequest} from "next/server";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "socthink-english-sso-"));
process.env.SOCTHINK_USER_DATA_DIR = tmp;
process.env.SOCTHINK_PUBLIC_ORIGIN = "https://socthink.cn";
for (const product of ["pronunciation", "vocabulary", "reading", "aelos"]) {
  process.env["SOCTHINK_ENGLISH_SSO_KEY_" + product.toUpperCase()] =
    "test-backend-only-key-" + product + "-do-not-deploy-123456";
}

async function run() {
try {
  const {authenticateOrCreateWechatParent, createParentSessionToken,
    PARENT_SESSION_COOKIE} = await import("../src/lib/parent-auth");
  const {issueEnglishSsoTicket, redeemEnglishSsoTicket,
    ENGLISH_SSO_TTL_MS} = await import("../src/lib/english-sso-ticket");
  const {POST: issue} = await import("../src/app/api/english/sso/ticket/route");
  const {POST: redeem} = await import("../src/app/api/english/sso/redeem/route");
  const {POST: verify} = await import("../src/app/api/english/sso/verify/route");

  const user = authenticateOrCreateWechatParent({
    wechatId: "synthetic-only-sso-test-id", openId: "synthetic-only-sso-test-openid",
  });
  const cookie = PARENT_SESSION_COOKIE + "=" + createParentSessionToken(user.id);
  const base = "https://socthink.cn";
  const ticketReq = (product: string, opts?: {cookie?: string; origin?: string}) =>
    new NextRequest(base + "/api/english/sso/ticket", {
      method: "POST",
      headers: {
        "origin": opts?.origin ?? base,
        "content-type": "application/json",
        ...(opts?.cookie === "" ? {} : {"cookie": opts?.cookie || cookie}),
      },
      body: JSON.stringify({product}),
    });
  const redeemReq = (product: string, ticket: string, key: string, origin?: string) =>
    new NextRequest(base + "/api/english/sso/redeem", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + key,
        ...(origin ? {origin} : {}),
      },
      body: JSON.stringify({product, ticket}),
    });

  assert.equal((await issue(ticketReq("reading", {cookie: ""}))).status, 401);
  assert.equal((await issue(ticketReq("reading", {origin:"https://attacker.invalid"}))).status, 403);
  assert.equal((await issue(ticketReq("other"))).status, 400);

  const good = await issue(ticketReq("reading"));
  assert.equal(good.status, 200);
  const issued = await good.json() as {ticket:string;expiresAt:number};
  assert.match(issued.ticket, /^[a-f0-9]{64}$/);
  assert.ok(issued.expiresAt > Date.now());
  assert.ok(!JSON.stringify(issued).includes(user.id));

  const keyReading = process.env.SOCTHINK_ENGLISH_SSO_KEY_READING!;
  const keyAelos = process.env.SOCTHINK_ENGLISH_SSO_KEY_AELOS!;
  assert.equal((await redeem(redeemReq("reading", issued.ticket, "wrong-secret"))).status, 401);
  assert.equal((await redeem(redeemReq("reading", issued.ticket, keyReading, base))).status, 403);
  assert.equal((await redeem(redeemReq("aelos", issued.ticket, keyAelos))).status, 410);
  const verified = await redeem(redeemReq("reading", issued.ticket, keyReading));
  assert.equal(verified.status, 200);
  const result = await verified.json() as {subject:string;product:string};
  assert.equal(result.product, "reading");
  assert.match(result.subject, /^soc_[a-f0-9]{40}$/);
  assert.ok(!JSON.stringify(result).includes(user.id));
  assert.ok(!JSON.stringify(result).includes("openid"));
  assert.equal((await redeem(redeemReq("reading", issued.ticket, keyReading))).status, 410);

  const verifyReq = (whichCookie: string, key: string, origin?: string) =>
    new NextRequest(base + "/api/english/sso/verify", {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":"Bearer " + key,
        ...(whichCookie ? {"cookie":whichCookie} : {}),
        ...(origin ? {origin} : {}),
      },
      body:JSON.stringify({product:"reading"}),
    });
  assert.equal((await verify(verifyReq("",keyReading))).status,401);
  assert.equal((await verify(verifyReq(cookie,"bad-key"))).status,401);
  assert.equal((await verify(verifyReq(cookie,keyReading,"https://socthink.cn"))).status,403);
  const verifiedSession = await verify(verifyReq(cookie,keyReading));
  assert.equal(verifiedSession.status,200);
  assert.equal((await verifiedSession.json() as {subject:string}).subject,result.subject);
  // Account switching must not preserve the original product identity.
  const other = authenticateOrCreateWechatParent({wechatId:"other-synthetic-wechat-id"});
  const anotherCookie = PARENT_SESSION_COOKIE + "=" + createParentSessionToken(other.id);
  const another = await verify(verifyReq(anotherCookie,keyReading));
  assert.equal(another.status,200);
  assert.notEqual((await another.json() as {subject:string}).subject,result.subject);

  const stable = issueEnglishSsoTicket("reading", user.id);
  const again = redeemEnglishSsoTicket("reading", stable.ticket);
  assert.equal(again?.subject, result.subject);
  const diffProduct = issueEnglishSsoTicket("aelos", user.id);
  const diff = redeemEnglishSsoTicket("aelos", diffProduct.ticket);
  assert.notEqual(diff?.subject, result.subject);
  assert.equal(redeemEnglishSsoTicket("reading", diffProduct.ticket), null);

  const expired = issueEnglishSsoTicket("reading", user.id, Date.now()-ENGLISH_SSO_TTL_MS-1);
  assert.equal(redeemEnglishSsoTicket("reading", expired.ticket), null);
  assert.equal(redeemEnglishSsoTicket("reading", "invalid"), null);
  assert.equal(fs.existsSync(path.join(tmp, "parents.json")), true);

  const t1 = issueEnglishSsoTicket("reading", user.id);
  const parallel = await Promise.all(Array.from({length: 5}, async () =>
    redeemEnglishSsoTicket("reading", t1.ticket)));
  assert.equal(parallel.filter(Boolean).length, 1);

  console.log("ENGLISH_SSO_TESTS_PASS: isolated synthetic data");
} finally {
  fs.rmSync(tmp, {recursive:true, force:true});
}

}
void run().catch(error => { console.error(error); process.exitCode = 1; });
