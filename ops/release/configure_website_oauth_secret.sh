#!/usr/bin/env bash
# Run from the operator's Z890 local interactive terminal.
# The website application secret is read without echo and piped over SSH;
# no real credentials are passed as CLI args, recorded in Git, or logged.
set -Eeuo pipefail
set +x
umask 077

if [[ ! -t 0 ]]; then
  echo "请在 Z890 交互式终端执行（需要隐藏输入 AppSecret）。" >&2
  exit 2
fi
read -r -s -p "请输入微信网站应用 AppSecret（不显示）: " WEBSITE_SECRET
echo
if [[ ! "$WEBSITE_SECRET" =~ ^[a-fA-F0-9]{32}$ ]]; then
  unset WEBSITE_SECRET
  echo "密钥格式无效，没有修改服务器。" >&2
  exit 3
fi

SSH_OPTIONS=(
  -F "$HOME/.ssh/config"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o ConnectTimeout=12
  -o "ProxyCommand=ssh -F $HOME/.ssh/config -o BatchMode=yes -o StrictHostKeyChecking=yes techai-server nc %h %p"
)
REMOTE="root@socthink.cn"
REMOTE_INSTALLER="/root/.socthink-website-auth-install.py"
WORK="$(mktemp -d)"
trap 'unset WEBSITE_SECRET; rm -rf "$WORK"' EXIT

cat > "$WORK/install.py" <<'PY'
import os
import re
import stat
import sys
import time
import tempfile

config = "/etc/socthink-math-wechat.env"
appid = "wx203f8050411f3f97"
value = sys.stdin.read().strip()
if re.fullmatch(r"[0-9a-fA-F]{32}", value) is None:
    raise SystemExit("INVALID_WEBSITE_SECRET_FORMAT")
metadata = os.stat(config)
if metadata.st_uid != 0 or stat.S_IMODE(metadata.st_mode) != 0o600:
    raise SystemExit("UNSAFE_EXISTING_CONFIG_PERMISSIONS")

with open(config, encoding="utf-8") as file:
    original = file.read()
existing = {}
for line in original.splitlines():
    if "=" not in line or line.lstrip().startswith("#"):
        continue
    key, val = line.split("=", 1)
    existing[key] = val
required = ("WECHAT_OPEN_APPID", "WECHAT_OPEN_SECRET",
            "WECHAT_MINIAPP_APPID", "WECHAT_MINIAPP_SECRET")
if any(not existing.get(key) for key in required):
    raise SystemExit("EXISTING_WECHAT_CREDENTIALS_INCOMPLETE")

if (existing.get("WECHAT_WEBSITE_APPID") == appid and
        existing.get("WECHAT_WEBSITE_SECRET") == value):
    print("WEBSITE_WECHAT_CONFIG=PASS")
    print("EXISTING_WECHAT_CREDENTIALS=PRESERVED")
    print("ALREADY_CONFIGURED=YES")
    raise SystemExit(0)

new_lines = [line for line in original.splitlines()
             if not line.startswith(("WECHAT_WEBSITE_APPID=", "WECHAT_WEBSITE_SECRET="))]
updated = "\n".join(new_lines).rstrip("\n")
updated += "\nWECHAT_WEBSITE_APPID=" + appid
updated += "\nWECHAT_WEBSITE_SECRET=" + value + "\n"

backup = config + ".before-website-" + time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
fd = os.open(backup, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w", encoding="utf-8") as f:
    f.write(original)
    f.flush()
    os.fsync(f.fileno())

fd, temporary = tempfile.mkstemp(dir=os.path.dirname(config), prefix=".website-wechat-")
try:
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(updated)
        f.flush()
        os.fsync(f.fileno())
    os.chown(temporary, metadata.st_uid, metadata.st_gid)
    os.chmod(temporary, 0o600)
    os.replace(temporary, config)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)

verified = {}
with open(config, encoding="utf-8") as f:
    for line in f:
        if "=" in line and not line.lstrip().startswith("#"):
            key, val = line.strip().split("=", 1)
            verified[key] = val
assert verified["WECHAT_WEBSITE_APPID"] == appid
assert verified["WECHAT_WEBSITE_SECRET"] == value
assert all(verified[k] == existing[k] for k in required)
assert stat.S_IMODE(os.stat(config).st_mode) == 0o600
print("WEBSITE_WECHAT_CONFIG=PASS")
print("EXISTING_WECHAT_CREDENTIALS=PRESERVED")
print("BACKUP=CREATED")
PY

ssh "${SSH_OPTIONS[@]}" "$REMOTE" "umask 077; cat > $REMOTE_INSTALLER; chmod 0600 $REMOTE_INSTALLER" < "$WORK/install.py"
printf '%s' "$WEBSITE_SECRET" | ssh "${SSH_OPTIONS[@]}" "$REMOTE" \
  "python3 $REMOTE_INSTALLER; result=\$?; rm -f $REMOTE_INSTALLER; exit \$result"
unset WEBSITE_SECRET
echo "配置校验完成；未重启生产服务。"
