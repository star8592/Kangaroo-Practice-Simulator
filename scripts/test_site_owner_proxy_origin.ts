import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { sameOriginMutation } from "../src/lib/site-owner-bootstrap";
const previous = process.env.NODE_ENV;
function request(origin?:string,fetchSite?:string) {
  const headers = new Headers({host:"socthink.cn"});
  if (origin) headers.set("origin",origin);
  if (fetchSite) headers.set("sec-fetch-site",fetchSite);
  return new NextRequest("http://127.0.0.1:3000/api/admin/site-owner/claim", {
    method:"POST",headers,
  });
}
try {
  // In production the origin is the public HTTPS site, not Next's upstream.
  Object.assign(process.env, {NODE_ENV:"production"});
  assert.equal(sameOriginMutation(request("https://socthink.cn","same-origin")),true);
  assert.equal(sameOriginMutation(request("https://socthink.cn")),true);
  assert.equal(sameOriginMutation(request("https://evil.example","same-origin")),false);
  assert.equal(sameOriginMutation(request("https://socthink.cn.evil.example","same-origin")),false);
  assert.equal(sameOriginMutation(request("https://www.socthink.cn","same-origin")),false);
  assert.equal(sameOriginMutation(request("http://socthink.cn","same-origin")),false);
  assert.equal(sameOriginMutation(request("https://socthink.cn","cross-site")),false);
  assert.equal(sameOriginMutation(request("https://socthink.cn","same-site")),false);
  assert.equal(sameOriginMutation(request()),false);
  assert.equal(sameOriginMutation(request("invalid_origin")),false);
  console.log("SITE_OWNER_PUBLIC_PROXY_ORIGIN_SECURITY_PASS=10");
} finally {
  if (previous===undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env,{NODE_ENV:previous});
}
