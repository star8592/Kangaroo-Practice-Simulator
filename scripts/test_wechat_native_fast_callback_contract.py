#!/usr/bin/env python3
"""Static architectural guard. Real PostgreSQL behavior lives in test_billing_ledger."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
route=(root/"src/app/api/payments/wechat/notify/route.ts").read_text()
ledger=(root/"src/lib/billing-ledger.ts").read_text()
worker=(root/"src/lib/wechat-native-reconciliation.ts").read_text()
assert "verifyWechatV3Notification" in route
assert "decryptWechatV3Resource" in route
assert "validateOfficialWechatPaidTrade" in route
assert "await recordVerifiedNativeNotification" in route
assert route.index("verifyWechatV3Notification") < route.index("await recordVerifiedNativeNotification")
assert route.index("await recordVerifiedNativeNotification") < route.index("return reply(204)")
assert "queryVerifiedWechatNativePayment" not in route
assert "settleVerifiedOrder" not in route
assert "notification_received_at=now()" in ledger
assert "reconcile_checked_at=NULL" in ledger
assert "settleVerifiedOrder" in worker and "queryVerifiedWechatNativePayment" in worker
print("WECHAT_FAST_CALLBACK_CONTRACT=PASS (signed, persisted, ACK; no network query or grant)")
