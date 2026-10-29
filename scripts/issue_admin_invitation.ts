#!/usr/bin/env tsx
// Owner-initiated server CLI. The link is intentionally never logged in website telemetry.
import { issueAdminInvitation } from "../src/lib/admin-invitation";
const idx = process.argv.indexOf("--email");
const email = idx >= 0 ? process.argv[idx + 1] : undefined;
if (!email) {
  console.error("Usage: tsx scripts/issue_admin_invitation.ts --email recipient@example.com");
  process.exit(2);
}
const invite = issueAdminInvitation(email);
console.log(JSON.stringify({
  recipient: invite.recipient,
  expiresAt: new Date(invite.expiresAt).toISOString(),
  url: "https://socthink.cn/admin/activate#invite=" + invite.token,
}));
