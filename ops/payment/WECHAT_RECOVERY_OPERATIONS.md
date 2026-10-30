# WeChat Native production reconciliation: recovery without a second ledger

**2026-10-30.** This is an operator-activated future component. Code committed
to GitHub **does not install or start a production timer**. Current production
payment credentials and billing DB remain absent; enabling the worker before
those prerequisites is not a substitute for completing authorized onboarding.

## Why it exists

WeChat Pay's official notification may time out or be lost. The callback
handler uses a signed official GET to confirm payment before settlement; if
that GET fails, the callback returns non-2xx for WeChat's limited retries.
The worker independently **queries WeChat Pay's signed order API** for any
still-pending Native order and commits via the **exact same**
`settleVerifiedOrder()` function as the webhook. This avoids permanently
leaving users unpaid in the ledger after a legitimate cash transaction.

No second financial state machine: the existing `billing_orders` table is
authoritative. Additive migration
`ops/db/002_wechat_reconciliation.sql` creates only a nullable attempt
timestamp and a pending-order index. The worker atomically claims up to 25
pending orders with `FOR UPDATE SKIP LOCKED`, marks a 2-minute retry
cooldown, then individually verifies official response signatures,
order/merchant/appid/currency/amount/transaction ID, and settles.
A deterministic event ID derived from the official transaction ID and the
current ledger's row locking/uniqueness ensure repeated callback + worker
activity cannot double-grant rights. The SHA-256 recorded for recovery is
computed from the **verified official provider response body**, not
an arbitrary synthetic hash.

## Activation prerequisites (do not bypass)

1. Both additive SQL migrations applied to the *actual* dedicated production
   billing DB, with backups and an independently tested restore.
2. Key files and APIv3 key securely provisioned in the real running service,
   valid merchant Native product/AppID approval and protected HTTPS notify URL.
3. `SOCTHINK_WECHAT_NATIVE_RECONCILIATION_ENABLED=1`, but the new-order flag
   can stay OFF. Confirm the live order query signature verification and
   production user entitlement mapping.
4. Exact `main` SHA deployed via the single existing immutable-release
   deployment pipeline; no manual code on server, no second scheduler.
5. On the actual production host, review the supplied systemd unit/timer and
   enable **exactly one** payment recovery timer **after authorized approval**.
   Do not create a parallel crontab, GitHub scheduled workflow, or a separate
   ThinkAI order settlement service.

### Operator-controlled installation

Only a separately authorized host operator should execute these after
prerequisite verification. Do not send secrets or order records to the chat:

```bash
cd /opt/socthink-releases/current
test -x node_modules/.bin/tsx
sudo install -m 0644 ops/payment/systemd/socthink-wechat-reconcile.service /etc/systemd/system/
sudo install -m 0644 ops/payment/systemd/socthink-wechat-reconcile.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now socthink-wechat-reconcile.timer
sudo systemctl list-timers socthink-wechat-reconcile.timer --no-pager
```

The worker produces only aggregate `scanned/settled/notPaid/failed` counts,
not private customer, transaction, merchant or key data. Nonzero failures
must be monitored and investigated: do not dismiss them as successful
fulfillment. Existing paid orders must remain settleable when
`SOCTHINK_WEB_NATIVE_PAYMENTS_ENABLED=0`.

### Genuine acceptance

- Fake/missing merchant materials: zero real funds and zero fake grants.
- A real invoice paid while callback is deliberately delayed: independent
  signed query repairs exactly one order and exactly one grant.
- Repeated callbacks and independent queries: still one grant.
- Native canceled/notpaid: no grant, no premature new order.
- Fatal provider/database errors: fail and retry without marking paid.
- A verified refund: provider final refund success **before** refund ledger
  transition and entitlement revocation. A refund API request accepted is
  **not** a successful refund.

This does not replace the mandatory actual low-value legal purchase, receipt,
refund and reconciliation E2E. The current codebase still lacks a fully
implemented official refund adapter.
