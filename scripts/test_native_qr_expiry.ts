import assert from "node:assert/strict";
import {
  checkoutQrTtlSeconds,remainingQrSeconds,validServerQrTtl,
  NATIVE_ORDER_WINDOW_SECONDS,QR_EXPIRY_SAFETY_SECONDS,
} from "../src/lib/native-qr-expiry";

const now=2_000_000_000;
const expires=now+NATIVE_ORDER_WINDOW_SECONDS;
assert.equal(NATIVE_ORDER_WINDOW_SECONDS,1800);
assert.equal(checkoutQrTtlSeconds(expires,now),1800-QR_EXPIRY_SAFETY_SECONDS);
assert.equal(checkoutQrTtlSeconds(expires,now+1792),3);
assert.equal(checkoutQrTtlSeconds(expires,now+1795),0);
assert.equal(checkoutQrTtlSeconds(expires,now+1800),0);
assert.equal(checkoutQrTtlSeconds(expires,now+1900),0);
assert.equal(checkoutQrTtlSeconds(now+999999,now),1800);
for(const v of [NaN,Infinity,-Infinity,1.2]) {
  assert.equal(checkoutQrTtlSeconds(v,now),0);
  assert.equal(checkoutQrTtlSeconds(expires,v),0);
}
for(const v of [0,-1,1796,1800,1801,"1800",NaN,Infinity,null,undefined]) {
  assert.equal(validServerQrTtl(v),false);
}
assert.equal(validServerQrTtl(1),true);
assert.equal(validServerQrTtl(1795),true);
assert.equal(validServerQrTtl(1800),false);
const origin=54201;const deadlineMono=origin+1795*1000;
assert.equal(remainingQrSeconds(deadlineMono,origin),1795);
assert.equal(remainingQrSeconds(deadlineMono,origin+1000),1794);
assert.equal(remainingQrSeconds(deadlineMono,deadlineMono-999),0);
assert.equal(remainingQrSeconds(deadlineMono,deadlineMono),0);
assert.equal(remainingQrSeconds(deadlineMono,deadlineMono+99_000),0);
assert.equal(remainingQrSeconds(null,origin),0);
assert.equal(remainingQrSeconds(deadlineMono,NaN),0);
console.log("NATIVE_QR_EXPIRY=PASS official_order_window bounded_server_ttl monotonic_client_clock fail_closed");
