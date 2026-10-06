import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  completeWechatQrLogin,
  consumeWechatQrLogin,
  issueWechatQrLogin,
  pollWechatQrLogin,
} from "../src/lib/wechat-qr-login";

const dir = path.join(process.cwd(), "private", "users");
const names = ["wechat-qr-login.json", "wechat-qr-login-secret.txt"];
const backup = new Map<string, Buffer | null>();
for (const name of names) {
  const file = path.join(dir, name);
  backup.set(name, fs.existsSync(file) ? fs.readFileSync(file) : null);
}

function restore() {
  for (const [name, bytes] of backup) {
    const file = path.join(dir, name);
    if (bytes === null) {
      if (fs.existsSync(file)) fs.rmSync(file);
    } else {
      fs.writeFileSync(file, bytes);
    }
  }
}

try {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of names) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  const now = Date.now();
  const issued = issueWechatQrLogin(now, 60_000);
  assert.match(issued.ticket, /^wqt_[0-9a-f]{48}$/);
  assert.match(issued.state, /^wqs_[0-9a-f]{48}$/);
  assert.equal(pollWechatQrLogin(issued.ticket, now + 1).status, "pending");
  assert.equal(completeWechatQrLogin("wqs_" + "0".repeat(48), "parent_x", now + 2), false);
  assert.equal(completeWechatQrLogin(issued.state, "parent_123", now + 3), true);

  const ready = pollWechatQrLogin(issued.ticket, now + 4);
  assert.equal(ready.status, "authenticated");
  assert.equal(ready.status === "authenticated" ? ready.parentId : "", "parent_123");

  assert.deepEqual(consumeWechatQrLogin(issued.ticket, now + 5), { parentId: "parent_123" });
  assert.equal(pollWechatQrLogin(issued.ticket, now + 6).status, "expired");
  assert.equal(consumeWechatQrLogin(issued.ticket, now + 7), null);

  console.log("WECHAT_QR_LOGIN=PASS one_time_ticket=true cross_device_state=true");
} finally {
  restore();
}
