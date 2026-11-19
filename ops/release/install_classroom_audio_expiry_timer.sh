#!/usr/bin/env bash
# Run only after the R57 database and new main backend release are deployed.
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || { echo "root required"; exit 2; }
test -f /opt/socthink-releases/current/scripts/cleanup_classroom_recordings.py
test -d /var/lib/socthink/accent-classroom/recordings
cat > /etc/systemd/system/socthink-classroom-audio-expiry.service <<'EOS'
[Unit]
Description=SOC THINK remove 30-day-expired classroom recording bytes
After=postgresql.service

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/flock -n /run/lock/socthink-classroom-audio-expiry.lock /usr/bin/python3 /opt/socthink-releases/current/scripts/cleanup_classroom_recordings.py
TimeoutStartSec=180
EOS
cat > /etc/systemd/system/socthink-classroom-audio-expiry.timer <<'EOS'
[Unit]
Description=Daily SOC THINK classroom voice retention enforcement

[Timer]
OnCalendar=*-*-* 04:20:00
RandomizedDelaySec=600
Persistent=true

[Install]
WantedBy=timers.target
EOS
systemctl daemon-reload
systemctl enable --now socthink-classroom-audio-expiry.timer
systemctl --no-pager list-timers socthink-classroom-audio-expiry.timer
