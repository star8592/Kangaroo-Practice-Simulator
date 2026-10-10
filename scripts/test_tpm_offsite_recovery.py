#!/usr/bin/env python3
"""TPM recovery: syntax/security invariants + real synthetic no-cloud restore if TPM exists."""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SEAL=ROOT/"ops/backup/seal_offsite_recovery_tpm.sh"
RESTORE=ROOT/"ops/backup/offsite_restore_drill_tpm.sh"
INSTALL=ROOT/"ops/backup/install_offsite_pull.sh"
PREFLIGHT=ROOT/"ops/backup/tpm_hardware_preflight.py"
assert all(p.is_file() for p in (SEAL,RESTORE,INSTALL,PREFLIGHT))
seal=SEAL.read_text()
restore=RESTORE.read_text()
installer=INSTALL.read_text()
for token in ("--with-key=tpm2","StrictHostKeyChecking=yes","systemd-creds encrypt",
              "existing_tpm_credential_unreadable","production_secret_rotated_existing_credential_preserved",
              'mv -- "$TMP" "$ESCROW"',"/etc/socthink/backup-passphrase"):
    assert token in seal, f"missing required sealing guard: {token}"
for token in ("systemd-creds decrypt", "--passphrase-file <(",
              "--no-same-owner", "--no-same-permissions", "tmpfs_required",
              "verify_offsite_replica.py", "verify_tree.py", "TPM_RECOVERY_DRILL=PASS"):
    assert token in restore,f"missing recovery guard: {token}"
for token in ("seal_offsite_recovery_tpm.sh","offsite_restore_drill_tpm.sh","verify_tree.py"):
    assert token in installer,f"installer missing stable script: {token}"
assert "ssh " not in restore and "curl " not in restore, "offline drill must not depend on cloud"
for p in (SEAL,RESTORE,INSTALL):
    subprocess.run(["bash","-n",str(p)],check=True)
subprocess.run([sys.executable,str(ROOT/"scripts/test_tpm_hardware_preflight.py")],check=True)

if not shutil.which("systemd-analyze") or not shutil.which("systemd-creds"):
    print("TPM_OFFSITE_CONTRACT=PASS TPM_REAL_FIXTURE=SKIPPED_NO_TPM_TOOLING")
    raise SystemExit(0)
if os.environ.get("SOCTHINK_RUN_TPM_FIXTURE")!="1":
    print("TPM_OFFSITE_CONTRACT=PASS TPM_REAL_FIXTURE=NOT_RUN_REQUIRES_EXPLICIT_APPROVAL")
    raise SystemExit(0)
probe=subprocess.run(["systemd-analyze","has-tpm2"],capture_output=True,text=True)
if probe.returncode or probe.stdout.strip().splitlines()[0]!="yes":
    print("TPM_OFFSITE_CONTRACT=PASS TPM_REAL_FIXTURE=SKIPPED_NO_TPM")
    raise SystemExit(0)

preflight=subprocess.run([sys.executable,str(PREFLIGHT),"--probe"],
                         capture_output=True,text=True,timeout=120)
if preflight.returncode != 0:
    # Intentionally return nonzero when explicitly authorized hardware proof is blocked.
    # A sandbox that sees the TPM node but cannot open it is NOT a TPM acceptance PASS.
    print("TPM_OFFSITE_CONTRACT=PASS TPM_REAL_FIXTURE=BLOCKED reason=hardware_preflight_failed")
    raise SystemExit(2)

name="socthink-production-backup-recovery-20261010"
archive_name="socthink-20261010T042200Z-"+("f"*12)+"-552.tar.zst.gpg"
with tempfile.TemporaryDirectory(prefix="socthink-tpm-fixture-") as t:
    base=Path(t)
    src=base/"source"
    out=base/"encrypted"
    recovery=out/"recovery"
    gnupg=base/"gnupg"
    out.mkdir();recovery.mkdir(mode=0o700);gnupg.mkdir(mode=0o700)
    def write(rel,contents):
        p=src/rel;p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text(contents,encoding="utf-8")
    write("private/users/users.json",'[{"id":"fixture"}]')
    write("private/users/exam-sessions.json","[]")
    write("private/users/exam-attempts.jsonl",'{"score":3}\n')
    write("private/arithmetic/sessions.jsonl",'{"done":true}\n')
    write("private/exams/fake.json",'{"demo":1}')
    write("public/local-assets/image.svg","<svg></svg>")
    write("public/generated-solutions/example.txt","synthetic")
    secret=b"temporary-synthetic-secret-ci-no-real-user-data"
    source_pass=base/"fixture.pass"
    source_pass.write_bytes(secret)
    source_pass.chmod(0o600)
    packed=base/"fixture.tar"
    compressed=base/"fixture.tar.zst"
    subprocess.run(["tar","-cf",str(packed),"-C",str(src),"private",
                    "public/local-assets","public/generated-solutions"],check=True)
    subprocess.run(["zstd","-q","-f",str(packed),"-o",str(compressed)],check=True)
    archive=out/archive_name
    env={**os.environ,"GNUPGHOME":str(gnupg),"SOCTHINK_OFFSITE_DIR":str(out),
         "SOCTHINK_TPM_RECOVERY_CREDENTIAL":str(recovery/"backup-passphrase.tpm.cred")}
    subprocess.run(["gpg","--batch","--yes","--quiet","--pinentry-mode","loopback",
        "--passphrase-file",str(source_pass),"--symmetric","--cipher-algo","AES256",
        "--compress-algo","none","-o",str(archive),str(compressed)],check=True,env=env)
    digest=hashlib.sha256(archive.read_bytes()).hexdigest()
    (out/(archive_name+".sha256")).write_text(digest+"  "+archive_name+"\n")
    receipt={"archive":archive_name,"archiveSha256":digest,"sizeBytes":archive.stat().st_size,
        "status":"PASS","isolatedRestore":"PASS","createdAt":datetime.now(timezone.utc).isoformat()}
    (out/(archive_name+".receipt.json")).write_text(json.dumps(receipt))
    sealed=recovery/"backup-passphrase.tpm.cred"
    with source_pass.open("rb") as fd:
        subprocess.run(["systemd-creds","encrypt","--with-key=tpm2",
            "--name="+name,"-",str(sealed)],stdin=fd,check=True,stdout=subprocess.DEVNULL)
    sealed.chmod(0o600)
    def launch():
        return subprocess.run(["bash",str(RESTORE)],env=env,capture_output=True,text=True,timeout=180)
    ok=launch()
    assert ok.returncode==0,(ok.returncode,ok.stdout[-1000:],ok.stderr[-1000:])
    assert "TPM_RECOVERY_DRILL=PASS" in ok.stdout
    assert not list(Path("/dev/shm").glob("socthink-offsite-recovery.*")), "plaintext tmpfs not cleaned"
    (out/(archive_name+".sha256")).write_text("0"*64+"  "+archive_name+"\n")
    corrupt=launch()
    assert corrupt.returncode!=0, "checksum tampering must prevent restore"
    (out/(archive_name+".sha256")).write_text(digest+"  "+archive_name+"\n")
    sealed.chmod(0o644)
    unsafe=launch()
    assert unsafe.returncode!=0 and "unsafe_credential_mode" in unsafe.stderr
    print("TPM_OFFSITE_CONTRACT=PASS TPM_REAL_FIXTURE=PASS cloud_not_used=YES data_tmpfs_only=YES tamper=BLOCKED")
